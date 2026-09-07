import {
    checkPackage,
    createPackageFromTarballData,
} from '@arethetypeswrong/core'
import type { Analysis, Problem, ResolutionKind } from '@arethetypeswrong/core'
import { problemAffectsResolutionKind } from '@arethetypeswrong/core/problems'
import { publint } from 'publint'
import { formatMessage, formatMessagePath } from 'publint/utils'
import type { PackCandidate } from './pack-candidate.js'
import type { CollectorOutcome, DoctorDiagnostic } from './types.js'

export type PackedValidationOptions = Readonly<{
    /** Resolution modes the package is meant to support; a problem outside them is not this package's contract. */
    resolutions?: ReadonlyArray<ResolutionKind>
}>

export type PackedValidationResult = Readonly<{
    attw: CollectorOutcome
    diagnostics: ReadonlyArray<DoctorDiagnostic>
    files: ReadonlyArray<string>
    packageName: string
    publint: CollectorOutcome
    resolutions: ReadonlyArray<ResolutionKind>
}>

/**
 * The Node profile Doctor judges against by default.
 *
 * `node10` is deliberately absent: legacy resolution cannot see `exports` at all, so every subpath of a modern package
 * reports as unresolvable. Including it by default would bury real findings under noise the package never promised to
 * avoid. A caller that does support legacy consumers asks for it explicitly.
 *
 * `node16-cjs` is included only for a package that actually offers a CommonJS entry — see
 * {@link advertisesCommonJsEntry}.
 */
/** Conditions a CommonJS consumer never matches, so a route behind one of them is closed to it. */
const ESM_ONLY_CONDITIONS = new Set(['import', 'module'])

const ESM_RESOLUTIONS: ReadonlyArray<ResolutionKind> = ['node16-esm']

const DUAL_RESOLUTIONS: ReadonlyArray<ResolutionKind> = [
    'node16-cjs',
    'node16-esm',
]

const PUBLINT_SEVERITY = {
    error: 'error',
    suggestion: 'warning',
    warning: 'warning',
} as const

/**
 * Run both validators against the candidate the caller already created.
 *
 * Neither collector packs anything: Publint is handed the tarball bytes through its `pack` option and ATTW builds its
 * package from the same bytes, so the two can only ever describe one artifact.
 */
export async function validatePackedCandidate(
    candidate: PackCandidate,
    options: PackedValidationOptions = {},
): Promise<PackedValidationResult> {
    const resolutions = options.resolutions ?? defaultResolutions(candidate)
    const [publintResult, attwResult] = await Promise.all([
        runPublint(candidate),
        runAttw(candidate, resolutions),
    ])

    return {
        attw: attwResult.outcome,
        diagnostics: [
            ...publintResult.diagnostics,
            ...attwResult.diagnostics,
        ].toSorted(
            (left, right) =>
                left.code.localeCompare(right.code) ||
                left.message.localeCompare(right.message),
        ),
        files: candidate.files,
        packageName: candidate.packageName,
        publint: publintResult.outcome,
        resolutions,
    }
}

/**
 * Whether the packed manifest is reachable by a CommonJS-side resolver at all.
 *
 * The test is reachability by _any_ resolver a CommonJS consumer uses, which is broader than whether Node's `require()`
 * can load the entry. Declaration resolution counts: TypeScript's CommonJS condition set includes `types`, so a root of
 * `{ types, import }` type-checks from a `.cts` file even though `require()` of it fails outright with
 * `ERR_PACKAGE_PATH_NOT_EXPORTED`. That asymmetry is the defect `CJSResolvesToESM` names — the type system tells a
 * CommonJS consumer the package is fine and Node then refuses to load it — so such a package must be judged, not
 * skipped. Deciding on `require()` alone would hide the most misleading shape of all.
 *
 * Node's precedence still decides where to look. When `exports` is declared it is the whole contract and `main` is
 * never consulted, so reachability is decided inside it — see {@link reachesCommonJs}, which asks what a CommonJS
 * consumer can match rather than looking for `require`. With no `exports`, `main` is the entry and its presence is the
 * offer.
 *
 * Skipping is therefore reserved for a package no CommonJS-side resolver can enter: neither its runtime nor its
 * declarations resolve, which ATTW reports as `NoResolution` rather than as a defect. Judging that package anyway is
 * how one ends up growing a CommonJS surface purely to satisfy its own checker. Nothing is hidden by skipping it —
 * build output that no `exports` condition points at is unreachable to every resolver, so there is no consumer contract
 * to get wrong.
 */
function advertisesCommonJsEntry(manifest: unknown): boolean {
    if (typeof manifest !== 'object' || manifest === null) return false

    const fields = manifest as Record<string, unknown>
    const exported = fields['exports']

    return exported === undefined || exported === null
        ? typeof fields['main'] === 'string'
        : reachesCommonJs(rootEntry(exported))
}

function attwEvidence(problem: Problem): ReadonlyArray<string> {
    const fields: ReadonlyArray<[string, string | undefined]> = [
        ['entrypoint', readField(problem, 'entrypoint')],
        ['resolution', readField(problem, 'resolutionKind')],
        ['types', readField(problem, 'typesFileName')],
        ['implementation', readField(problem, 'implementationFileName')],
        ['file', readField(problem, 'fileName')],
    ]
    return [
        `attw:${problem.kind}`,
        ...fields
            .filter(([, value]) => value !== undefined)
            .map(([label, value]) => `${label}:${String(value)}`),
    ]
}

function collectorFailure(
    candidate: PackCandidate,
    code: 'ATTW_COLLECTOR_FAILED' | 'PUBLINT_COLLECTOR_FAILED',
    error: unknown,
): DoctorDiagnostic {
    return {
        code,
        evidence: [`tarball:${candidate.tarball}`],
        message: `${code === 'PUBLINT_COLLECTOR_FAILED' ? 'Publint' : 'ATTW'} did not complete: ${describe(error)}`,
        packageName: candidate.packageName,
        packageRoot: candidate.artifactRoot,
        severity: 'error',
    }
}

/** The resolution kinds a candidate's own manifest says it supports. */
function defaultResolutions(
    candidate: PackCandidate,
): ReadonlyArray<ResolutionKind> {
    return advertisesCommonJsEntry(candidate.manifest)
        ? DUAL_RESOLUTIONS
        : ESM_RESOLUTIONS
}

function describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

function describeSubject(problem: Problem): string {
    return (
        readField(problem, 'entrypoint') ??
        readField(problem, 'typesFileName') ??
        readField(problem, 'fileName') ??
        'the package'
    )
}

function isTypedAnalysis(
    result: Awaited<ReturnType<typeof checkPackage>>,
): result is Analysis {
    return 'problems' in result
}

/**
 * Whether any branch of an `exports` value is reachable by a CommonJS consumer.
 *
 * Reachability is decided by what a condition _excludes_, not by looking for `require`. CommonJS resolution matches
 * every condition except the ESM-only ones, so `default`, `node`, a bare `types` and a plain string target all route
 * CommonJS somewhere — a package can offer CommonJS without ever writing `require`. Only a route gated entirely behind
 * `import` is closed to it.
 */
function reachesCommonJs(value: unknown): boolean {
    if (typeof value === 'string') return true
    if (Array.isArray(value)) return value.some(reachesCommonJs)
    if (typeof value !== 'object' || value === null) return false

    return Object.entries(value).some(
        ([condition, target]) =>
            !ESM_ONLY_CONDITIONS.has(condition) && reachesCommonJs(target),
    )
}

function readField(problem: Problem, field: string): string | undefined {
    const value = (problem as unknown as Record<string, unknown>)[field]
    return typeof value === 'string' ? value : undefined
}

/**
 * The `exports` branch describing the package's own entry point.
 *
 * A subpath map is addressed by its `"."` key; anything else is the root's condition set directly. Only the root
 * decides whether CommonJS consumers are offered an entry, because a subpath cannot be one: every package exposes
 * `"./package.json"` as a plain string, and reading that as a CommonJS offer would classify every ESM-only package as
 * dual.
 */
function rootEntry(exported: unknown): unknown {
    if (typeof exported !== 'object' || exported === null) return exported
    if (Array.isArray(exported)) return exported

    const entries = exported as Record<string, unknown>

    return Object.keys(entries).some((key) => key.startsWith('.'))
        ? entries['.']
        : entries
}

async function runAttw(
    candidate: PackCandidate,
    resolutions: ReadonlyArray<ResolutionKind>,
): Promise<{
    diagnostics: ReadonlyArray<DoctorDiagnostic>
    outcome: CollectorOutcome
}> {
    try {
        const analysis = await checkPackage(
            createPackageFromTarballData(candidate.tarballBytes),
        )
        if (!isTypedAnalysis(analysis)) {
            // Not a failure — ATTW ran fine — but it had no type surface to judge, which must not read as a pass.
            return {
                diagnostics: [],
                outcome: {
                    reason: 'the package publishes no type declarations',
                    state: 'not_applicable',
                },
            }
        }

        const relevant = analysis.problems.filter((problem) =>
            resolutions.some((resolution) =>
                problemAffectsResolutionKind(problem, resolution, analysis),
            ),
        )

        return {
            diagnostics: relevant.map((problem) => ({
                code: 'ATTW_RESOLUTION_PROBLEM',
                evidence: attwEvidence(problem),
                message: `${problem.kind} for ${describeSubject(problem)}`,
                packageName: candidate.packageName,
                packageRoot: candidate.artifactRoot,
                severity: 'error',
            })),
            outcome: { state: 'completed' },
        }
    } catch (error) {
        return {
            diagnostics: [
                collectorFailure(candidate, 'ATTW_COLLECTOR_FAILED', error),
            ],
            outcome: { detail: describe(error), state: 'failed' },
        }
    }
}

async function runPublint(candidate: PackCandidate): Promise<{
    diagnostics: ReadonlyArray<DoctorDiagnostic>
    outcome: CollectorOutcome
}> {
    try {
        const result = await publint({
            level: 'suggestion',
            // The candidate is already packed; handing over its bytes is what stops publint repacking the source.
            pack: { tarball: toArrayBuffer(candidate.tarballBytes) },
            // With a tarball, `pkgDir` addresses the archive's own root rather than a path on disk.
            pkgDir: candidate.tarballRoot,
        })

        return {
            diagnostics: result.messages.map((message) => ({
                code: `PUBLINT_${message.type.toUpperCase()}` as DoctorDiagnostic['code'],
                evidence: [
                    `publint:${message.code}`,
                    ...(message.path.length > 0
                        ? [`package.json#${formatMessagePath(message.path)}`]
                        : []),
                ],
                message: formatMessage(message, result.pkg) ?? message.code,
                packageName: candidate.packageName,
                packageRoot: candidate.artifactRoot,
                severity: PUBLINT_SEVERITY[message.type],
            })),
            outcome: { state: 'completed' },
        }
    } catch (error) {
        return {
            diagnostics: [
                collectorFailure(candidate, 'PUBLINT_COLLECTOR_FAILED', error),
            ],
            outcome: { detail: describe(error), state: 'failed' },
        }
    }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer
}
