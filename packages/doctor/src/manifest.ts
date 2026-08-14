import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { findFixtureId } from './fixtures.js'
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

export type PackageManifest = JsonRecord & {
    bin?: Record<string, string> | string
    exports?: unknown
    main?: string
    module?: string
    name?: string
    types?: string
    version?: string
}

type DiagnosticInput = Readonly<{
    code: DiagnosticCode
    evidence?: ReadonlyArray<string>
    message: string
    packageName: string
    packageRoot: string
    severity?: DoctorDiagnostic['severity']
}>

type JsonRecord = Record<string, unknown>

/** Analyze one package manifest and its currently emitted filesystem targets. */
export function analyzePackage(packageRootInput: string): DoctorPackageReport {
    const packageRoot = path.resolve(packageRootInput)
    const manifestPath = path.join(packageRoot, 'package.json')
    const fallbackPackageName = `(unnamed:${path.basename(packageRoot)})`

    let manifest: PackageManifest

    try {
        const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'))

        if (!isJsonRecord(parsed)) {
            throw new TypeError('package.json must contain a JSON object')
        }

        manifest = parsed
    } catch (error) {
        const diagnostic = createDiagnostic({
            code: 'MANIFEST_READ_ERROR',
            evidence: [error instanceof Error ? error.message : String(error)],
            message: 'Unable to read a valid package manifest.',
            packageName: fallbackPackageName,
            packageRoot,
            severity: 'error',
        })

        return {
            diagnostics: [diagnostic],
            manifestPath,
            packageName: fallbackPackageName,
            packageRoot,
        }
    }

    const packageName =
        typeof manifest.name === 'string' && manifest.name.trim()
            ? manifest.name.trim()
            : fallbackPackageName
    const diagnostics: Array<DoctorDiagnostic> = []

    if (packageName === fallbackPackageName) {
        diagnostics.push(
            createDiagnostic({
                code: 'MANIFEST_NAME_MISSING',
                message:
                    'package.json does not declare a non-empty package name.',
                packageName,
                packageRoot,
                severity: 'error',
            }),
        )
    }

    diagnostics.push(
        ...analyzeExportTargets(manifest, packageName, packageRoot),
        ...analyzeLegacyTargets(manifest, packageName, packageRoot),
        ...analyzeBinTargets(manifest, packageName, packageRoot),
    )

    return {
        diagnostics,
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
    manifest: PackageManifest,
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
    manifest: PackageManifest,
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
    manifest: PackageManifest,
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
    bin: PackageManifest['bin'],
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

function isJsonRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
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
