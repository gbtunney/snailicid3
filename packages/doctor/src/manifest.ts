import { jsonTextSchema, packageIdentitySchema } from '@snailicid3/node-utils'
import type { z } from 'zod'
import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { findFixtureId } from './fixtures.js'
import {
    collectManifestFacts,
    derivePackageRole,
    isMonorepoMember,
    type ManifestFacts,
    requiredMetadataFields,
} from './manifest-facts.js'
import {
    collectDeclaredExportTargets,
    collectMalformedExportLeaves,
    type DeclaredExportTarget,
    type DeclaredTarget,
    formatTargetEvidence,
    type TargetVerdict,
    validateDeclaredTarget,
} from './manifest-targets.js'
import type {
    DiagnosticCode,
    DoctorDiagnostic,
    DoctorPackageReport,
} from './types.js'

export {
    collectDeclaredExportTargets,
    type DeclaredExportTarget,
} from './manifest-targets.js'

type DiagnosticInput = Readonly<{
    code: DiagnosticCode
    evidence?: ReadonlyArray<string>
    message: string
    packageName: string
    packageRoot: string
    severity?: DoctorDiagnostic['severity']
}>

type JsonRecord = Record<string, unknown>

/** Entry fields that predate `exports` and are still consulted by older resolvers. */
const LEGACY_ENTRY_FIELDS = ['main', 'module', 'types'] as const

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

/**
 * Validate every declared bin target, then ask the extra question a bin has to answer.
 *
 * Existence and path shape come from the shared schema like any other target; the executable bit is layered on top as a
 * Doctor refinement, because it is not a fact about a path but about whether a consumer's shell could run it. It is
 * asked only of targets that resolved, since "not executable" is not a useful thing to say about a file that is not
 * there.
 */
function analyzeBinTargets(
    manifest: Record<string, unknown>,
    packageName: string,
    packageRoot: string,
): ReadonlyArray<DoctorDiagnostic> {
    const missing: Array<string> = []
    const notExecutable: Array<string> = []

    for (const declared of collectBinTargets(manifest['bin'], packageName)) {
        const verdict = validateDeclaredTarget(packageRoot, declared.target, {
            requireRelativeSpecifier: false,
        })

        if (verdict.kind !== 'valid') {
            missing.push(describeUnusableTarget(declared, verdict))
            continue
        }

        if (isNotExecutable(verdict.resolvedPath)) {
            notExecutable.push(formatTargetEvidence(declared))
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

/**
 * Validate every string leaf of the `exports` map.
 *
 * Two findings rather than one, and the split is deliberate: a target that is malformed or reaches outside the package
 * is wrong as declared and stays wrong however the package is built, while a target that is merely absent describes the
 * tree as it stands right now and may only mean the package has not been built yet. Collapsing them would make an
 * unbuilt package look broken and a broken one look unbuilt.
 */
function analyzeExportTargets(
    manifest: Record<string, unknown>,
    packageName: string,
    packageRoot: string,
): ReadonlyArray<DoctorDiagnostic> {
    if (manifest['exports'] === undefined) return []

    const diagnostics: Array<DoctorDiagnostic> = []
    const missing: Array<string> = []
    const invalid: Array<string> = collectMalformedExportLeaves(
        manifest['exports'],
    ).map(
        (leaf) =>
            `package.json#${leaf.fieldPath} (target must be a string or null, not ${leaf.typeName})`,
    )

    for (const declared of collectDeclaredExportTargets(manifest['exports'])) {
        const verdict = validateDeclaredTarget(packageRoot, declared.target, {
            requireRelativeSpecifier: true,
        })

        switch (verdict.kind) {
            case 'escapesPackageRoot':
            case 'notRelativeSpecifier': {
                invalid.push(describeUnusableTarget(declared, verdict))
                break
            }
            case 'missing':
            case 'unmatchedWildcard': {
                missing.push(describeUnusableTarget(declared, verdict))
                break
            }
            case 'valid': {
                break
            }
        }
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

    const rootExport = getRootExport(manifest['exports'])

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

/**
 * Validate the entry fields that predate `exports`, on the same shared schema.
 *
 * The `./` prefix is not required here: npm has always accepted a bare `dist/index.js` in these fields, and demanding
 * the prefix would invent a rule and report packages that are correct. A wildcard is no longer skipped, so a pattern
 * matching nothing is reported like any other target that is not there.
 */
function analyzeLegacyTargets(
    manifest: Record<string, unknown>,
    packageName: string,
    packageRoot: string,
): ReadonlyArray<DoctorDiagnostic> {
    const missing = LEGACY_ENTRY_FIELDS.flatMap((field) => {
        const target = manifest[field]
        if (typeof target !== 'string') return []

        const declared: DeclaredTarget = { fieldPath: field, target }
        const verdict = validateDeclaredTarget(packageRoot, target, {
            requireRelativeSpecifier: false,
        })

        return verdict.kind === 'valid'
            ? []
            : [describeUnusableTarget(declared, verdict)]
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

/**
 * Every declared bin target, across both shapes npm accepts.
 *
 * A string `bin` installs one command under the package's own name, so the manifest path is the field itself; a map
 * names each command, and the path addresses the entry that declared it.
 */
function collectBinTargets(
    bin: unknown,
    packageName: string,
): ReadonlyArray<DeclaredTarget> {
    if (typeof bin === 'string') {
        return [{ fieldPath: 'bin', target: bin }]
    }

    if (!isJsonRecord(bin)) return []

    return Object.entries(bin).flatMap(([name, target]) =>
        typeof target === 'string'
            ? [{ fieldPath: `bin[${JSON.stringify(name)}]`, target }]
            : [],
    )
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

/**
 * Evidence for a target the package cannot use, leading with the exact manifest path that declared it.
 *
 * The reason is appended rather than folded into the diagnostic message because one diagnostic carries many targets,
 * and they can be unusable for different reasons.
 */
function describeUnusableTarget(
    declared: DeclaredExportTarget | DeclaredTarget,
    verdict: Exclude<TargetVerdict, { kind: 'valid' }>,
): string {
    const evidence = formatTargetEvidence(declared)

    switch (verdict.kind) {
        case 'escapesPackageRoot': {
            return `${evidence} (target leaves the package root)`
        }
        case 'missing': {
            return evidence
        }
        case 'notRelativeSpecifier': {
            return `${evidence} (target must start with ./)`
        }
        case 'unmatchedWildcard': {
            return `${evidence} (wildcard matched no files)`
        }
    }
}

function formatCount(count: number, noun: string): string {
    return `${String(count)} ${noun}${count === 1 ? '' : 's'}`
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

/** Whether a resolved bin target lacks any executable bit, on platforms where that bit means anything. */
function isNotExecutable(resolvedPath: string): boolean {
    return (
        process.platform !== 'win32' &&
        (statSync(resolvedPath).mode & 0o111) === 0
    )
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
    return facts.private === true && facts.access !== undefined
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
