import { jsonTextSchema, packageIdentitySchema } from '@snailicid3/node-utils'
import type { z } from 'zod'
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { findFixtureId } from './fixtures.js'
import {
    collectManifestFacts,
    derivePackageRole,
    isMonorepoMember,
    type ManifestFacts,
    requiredMetadataFields,
} from './manifest-facts.js'
import type {
    DiagnosticCode,
    DoctorDiagnostic,
    DoctorPackageReport,
} from './types.js'

export type DeclaredExportTarget = Readonly<{
    conditions: ReadonlyArray<string>
    exportKey: string
    target: string
}>

type DiagnosticInput = Readonly<{
    code: DiagnosticCode
    evidence?: ReadonlyArray<string>
    message: string
    packageName: string
    packageRoot: string
    severity?: DoctorDiagnostic['severity']
}>

type JsonRecord = Record<string, unknown>

/**
 * Analyze one package manifest and its currently emitted filesystem targets.
 *
 * Reading is deliberately layered. The manifest is decoded as JSON first, then the canonical identity schema is applied
 * separately, so a single malformed field costs one diagnostic rather than the whole report: an unparseable manifest
 * hides every other finding about the package, which is the opposite of what a diagnostic tool should do.
 */
export function analyzePackage(packageRootInput: string): DoctorPackageReport {
    const packageRoot = path.resolve(packageRootInput)
    const manifestPath = path.join(packageRoot, 'package.json')
    const fallbackPackageName = `(unnamed:${path.basename(packageRoot)})`

    const decoded = readManifestJson(manifestPath)

    if (!decoded.success) {
        return {
            diagnostics: [
                createDiagnostic({
                    code: 'MANIFEST_READ_ERROR',
                    evidence: [decoded.error],
                    message: 'Unable to read a valid package manifest.',
                    packageName: fallbackPackageName,
                    packageRoot,
                    severity: 'error',
                }),
            ],
            manifestPath,
            packageName: fallbackPackageName,
            packageRoot,
        }
    }

    const rawManifest = decoded.manifest
    const identity = packageIdentitySchema.safeParse(rawManifest)
    const facts = collectManifestFacts(
        identity.success ? identity.data : rawManifest,
        rawManifest,
    )
    const packageName = facts.name ?? fallbackPackageName
    const role = derivePackageRole(packageRoot, facts, rawManifest)

    const diagnostics: Array<DoctorDiagnostic> = [
        ...(identity.success
            ? []
            : invalidFieldDiagnostics(
                  identity.error,
                  packageName,
                  packageRoot,
              )),
        ...identityDiagnostics(facts, packageName, packageRoot),
        ...metadataDiagnostics(
            role,
            rawManifest,
            facts,
            packageName,
            packageRoot,
        ),
        ...publicationFieldDiagnostics(facts, packageName, packageRoot),
        ...analyzeExportTargets(rawManifest, packageName, packageRoot),
        ...analyzeLegacyTargets(rawManifest, packageName, packageRoot),
        ...analyzeBinTargets(rawManifest, packageName, packageRoot),
    ]

    return {
        diagnostics,
        manifestFacts: facts,
        manifestPath,
        packageName,
        packageRoot,
    }
}

/** Flatten string targets from a package exports value while preserving routing evidence. */
export function collectDeclaredExportTargets(
    exportsValue: unknown,
): ReadonlyArray<DeclaredExportTarget> {
    const targets: Array<DeclaredExportTarget> = []

    if (isJsonRecord(exportsValue)) {
        const entries = Object.entries(exportsValue)
        const hasSubpathKeys = entries.some(([key]) => key.startsWith('.'))

        if (hasSubpathKeys) {
            for (const [exportKey, value] of entries) {
                visitExportValue(value, exportKey, [], targets)
            }
            return targets
        }
    }

    visitExportValue(exportsValue, '.', [], targets)
    return targets
}

function analyzeBinTargets(
    manifest: Record<string, unknown>,
    packageName: string,
    packageRoot: string,
): ReadonlyArray<DoctorDiagnostic> {
    const binTargets = getBinTargets(manifest.bin, packageName)
    const missing: Array<string> = []
    const notExecutable: Array<string> = []

    for (const [binName, target] of binTargets) {
        const resolvedTarget = path.resolve(packageRoot, target)
        const evidence = `${binName} -> ${target}`

        if (!existsSync(resolvedTarget)) {
            missing.push(evidence)
            continue
        }

        if (
            process.platform !== 'win32' &&
            (statSync(resolvedTarget).mode & 0o111) === 0
        ) {
            notExecutable.push(evidence)
        }
    }

    const diagnostics: Array<DoctorDiagnostic> = []

    if (missing.length > 0) {
        diagnostics.push(
            createDiagnostic({
                code: 'BIN_TARGET_MISSING',
                evidence: missing,
                message: `${formatCount(missing.length, 'declared package bin target')} ${missing.length === 1 ? 'does' : 'do'} not exist.`,
                packageName,
                packageRoot,
            }),
        )
    }

    if (notExecutable.length > 0) {
        diagnostics.push(
            createDiagnostic({
                code: 'BIN_TARGET_NOT_EXECUTABLE',
                evidence: notExecutable,
                message: `${formatCount(notExecutable.length, 'declared package bin target')} ${notExecutable.length === 1 ? 'is' : 'are'} not executable.`,
                packageName,
                packageRoot,
            }),
        )
    }

    return diagnostics
}

function analyzeExportTargets(
    manifest: Record<string, unknown>,
    packageName: string,
    packageRoot: string,
): ReadonlyArray<DoctorDiagnostic> {
    if (manifest.exports === undefined) return []

    const diagnostics: Array<DoctorDiagnostic> = []
    const missing: Array<string> = []
    const invalid: Array<string> = []

    for (const declared of collectDeclaredExportTargets(manifest.exports)) {
        const evidence = formatExportTarget(declared)

        if (declared.target.includes('*')) continue

        if (!declared.target.startsWith('./')) {
            invalid.push(`${evidence} (target must start with ./)`)
            continue
        }

        const resolvedTarget = path.resolve(packageRoot, declared.target)
        const relativeTarget = path.relative(packageRoot, resolvedTarget)

        if (
            relativeTarget.startsWith('..') ||
            path.isAbsolute(relativeTarget)
        ) {
            invalid.push(`${evidence} (target leaves the package root)`)
            continue
        }

        if (!existsSync(resolvedTarget)) missing.push(evidence)
    }

    if (invalid.length > 0) {
        diagnostics.push(
            createDiagnostic({
                code: 'EXPORT_TARGET_INVALID',
                evidence: invalid,
                message: `${formatCount(invalid.length, 'declared export target')} ${invalid.length === 1 ? 'is' : 'are'} invalid.`,
                packageName,
                packageRoot,
                severity: 'error',
            }),
        )
    }

    if (missing.length > 0) {
        diagnostics.push(
            createDiagnostic({
                code: 'EXPORT_TARGET_MISSING',
                evidence: missing,
                message: `${formatCount(missing.length, 'declared export target')} ${missing.length === 1 ? 'does' : 'do'} not exist in the package tree.`,
                packageName,
                packageRoot,
            }),
        )
    }

    const rootExport = getRootExport(manifest.exports)

    if (
        typeof manifest.types === 'string' &&
        rootExport !== undefined &&
        !hasCondition(rootExport, 'types')
    ) {
        diagnostics.push(
            createDiagnostic({
                code: 'EXPORT_TYPES_CONDITION_MISSING',
                evidence: [
                    `package.json#types -> ${manifest.types}`,
                    'package.json#exports["."] has no types condition',
                ],
                message:
                    'The package has a legacy types target but no explicit root exports types condition.',
                packageName,
                packageRoot,
            }),
        )
    }

    return diagnostics
}

function analyzeLegacyTargets(
    manifest: Record<string, unknown>,
    packageName: string,
    packageRoot: string,
): ReadonlyArray<DoctorDiagnostic> {
    const missing = (['main', 'module', 'types'] as const).flatMap((field) => {
        const target = manifest[field]

        return typeof target === 'string' &&
            !target.includes('*') &&
            !existsSync(path.resolve(packageRoot, target))
            ? [`package.json#${field} -> ${target}`]
            : []
    })

    return missing.length === 0
        ? []
        : [
              createDiagnostic({
                  code: 'LEGACY_TARGET_MISSING',
                  evidence: missing,
                  message: `${formatCount(missing.length, 'legacy package entry target')} ${missing.length === 1 ? 'does' : 'do'} not exist in the package tree.`,
                  packageName,
                  packageRoot,
              }),
          ]
}

function createDiagnostic(input: DiagnosticInput): DoctorDiagnostic {
    const evidence = input.evidence ?? []
    const fixtureId = findFixtureId(input.packageName, input.code, evidence)

    return {
        code: input.code,
        evidence,
        message: input.message,
        packageName: input.packageName,
        packageRoot: input.packageRoot,
        severity: input.severity ?? 'warning',
        ...(fixtureId === undefined ? {} : { fixtureId }),
    }
}

function formatCount(count: number, noun: string): string {
    return `${String(count)} ${noun}${count === 1 ? '' : 's'}`
}

function formatExportTarget(target: DeclaredExportTarget): string {
    const conditions =
        target.conditions.length === 0
            ? 'default'
            : target.conditions.join(' > ')

    return `${target.exportKey} (${conditions}) -> ${target.target}`
}

function getBinTargets(
    bin: unknown,
    packageName: string,
): ReadonlyArray<readonly [string, string]> {
    if (typeof bin === 'string') return [[packageName, bin]]
    if (!isJsonRecord(bin)) return []

    return Object.entries(bin).flatMap(([name, target]) =>
        typeof target === 'string' ? [[name, target] as const] : [],
    )
}

function getRootExport(exportsValue: unknown): unknown {
    if (!isJsonRecord(exportsValue)) return exportsValue

    return Object.keys(exportsValue).some((key) => key.startsWith('.'))
        ? exportsValue['.']
        : exportsValue
}

function hasCondition(value: unknown, condition: string): boolean {
    if (Array.isArray(value)) {
        return value.some((item) => hasCondition(item, condition))
    }

    if (!isJsonRecord(value)) return false
    if (Object.hasOwn(value, condition)) return true

    return Object.values(value).some((item) => hasCondition(item, condition))
}

/** Identity every package needs regardless of how it participates in the repository. */
function identityDiagnostics(
    facts: ManifestFacts,
    packageName: string,
    packageRoot: string,
): ReadonlyArray<DoctorDiagnostic> {
    return facts.name === undefined
        ? [
              createDiagnostic({
                  code: 'MANIFEST_NAME_MISSING',
                  message:
                      'package.json does not declare a non-empty package name.',
                  packageName,
                  packageRoot,
                  severity: 'error',
              }),
          ]
        : []
}

/** One diagnostic per identity field whose declared value is not the shape the shared schema accepts. */
function invalidFieldDiagnostics(
    error: z.ZodError,
    packageName: string,
    packageRoot: string,
): ReadonlyArray<DoctorDiagnostic> {
    return error.issues.map((issue) => {
        const field = issue.path.join('.') || '(root)'

        return createDiagnostic({
            code: 'MANIFEST_FIELD_INVALID',
            evidence: [`package.json#${field}`, issue.message],
            message: `package.json field "${field}" is not a valid value.`,
            packageName,
            packageRoot,
            severity: 'error',
        })
    })
}

/** A declared field counts as present only when it carries something usable, not merely a key. */
function isDeclared(value: unknown): boolean {
    if (typeof value === 'string') return value.trim().length > 0
    if (Array.isArray(value)) return value.length > 0
    if (isJsonRecord(value)) return Object.keys(value).length > 0
    return value !== undefined && value !== null
}

function isJsonRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Metadata a consumer of a published package needs, reported one field at a time.
 *
 * Independent diagnostics rather than one combined finding: a package missing only a license is a different repair from
 * one missing everything, and a single collapsed finding cannot be waived or tracked per field.
 */
function metadataDiagnostics(
    role: ReturnType<typeof derivePackageRole>,
    rawManifest: Record<string, unknown>,
    facts: ManifestFacts,
    packageName: string,
    packageRoot: string,
): ReadonlyArray<DoctorDiagnostic> {
    const diagnostics = requiredMetadataFields(role).flatMap((field) =>
        isDeclared(rawManifest[field])
            ? []
            : [
                  createDiagnostic({
                      code: 'MANIFEST_METADATA_MISSING',
                      evidence: [`package.json#${field}`],
                      message: `package.json does not declare a usable "${field}".`,
                      packageName,
                      packageRoot,
                  }),
              ],
    )

    const needsDirectory =
        requiredMetadataFields(role).length > 0 &&
        facts.repository !== undefined &&
        facts.repository.directory === undefined &&
        isMonorepoMember(packageRoot)

    return needsDirectory
        ? [
              ...diagnostics,
              createDiagnostic({
                  code: 'MANIFEST_METADATA_MISSING',
                  evidence: ['package.json#repository.directory'],
                  message:
                      'A package inside a monorepo does not declare which repository directory it lives in.',
                  packageName,
                  packageRoot,
              }),
          ]
        : diagnostics
}

/**
 * Publication fields that contradict each other as declared.
 *
 * This reports the contradiction only. Whether the package may publish is a release decision that needs intent and
 * registry state Doctor cannot see, so no status, eligibility or hold is derived here.
 */
function publicationFieldDiagnostics(
    facts: ManifestFacts,
    packageName: string,
    packageRoot: string,
): ReadonlyArray<DoctorDiagnostic> {
    return facts.private && facts.access !== undefined
        ? [
              createDiagnostic({
                  code: 'MANIFEST_PUBLICATION_FIELDS_CONFLICT',
                  evidence: [
                      'package.json#private -> true',
                      `package.json#publishConfig.access -> ${facts.access}`,
                  ],
                  message:
                      'The package is marked private but also declares npm publish access.',
                  packageName,
                  packageRoot,
              }),
          ]
        : []
}

/** Decode the manifest as a JSON object, keeping "absent or unreadable" distinct from "not an object". */
function readManifestJson(
    manifestPath: string,
):
    | Readonly<{ error: string; success: false }>
    | Readonly<{ manifest: Record<string, unknown>; success: true }> {
    let contents: string

    try {
        contents = readFileSync(manifestPath, 'utf8')
    } catch (error) {
        return {
            error: error instanceof Error ? error.message : String(error),
            success: false,
        }
    }

    const decoded = jsonTextSchema.safeParse(contents)

    if (!decoded.success) {
        return {
            error: decoded.error.issues[0]?.message ?? 'Invalid JSON',
            success: false,
        }
    }

    return isJsonRecord(decoded.data)
        ? { manifest: decoded.data, success: true }
        : { error: 'package.json must contain a JSON object', success: false }
}

function visitExportValue(
    value: unknown,
    exportKey: string,
    conditions: ReadonlyArray<string>,
    targets: Array<DeclaredExportTarget>,
): void {
    if (typeof value === 'string') {
        targets.push({ conditions, exportKey, target: value })
        return
    }

    if (Array.isArray(value)) {
        value.forEach((item, index) => {
            visitExportValue(
                item,
                exportKey,
                [...conditions, `fallback[${String(index)}]`],
                targets,
            )
        })
        return
    }

    if (!isJsonRecord(value)) return

    for (const [condition, target] of Object.entries(value)) {
        visitExportValue(target, exportKey, [...conditions, condition], targets)
    }
}
