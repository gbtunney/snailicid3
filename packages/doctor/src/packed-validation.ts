import {
    checkPackage,
    createPackageFromTarballData,
} from '@arethetypeswrong/core'
import type { Analysis, Problem, ResolutionKind } from '@arethetypeswrong/core'
import { problemAffectsResolutionKind } from '@arethetypeswrong/core/problems'
import { publint } from 'publint'
import { formatMessage, formatMessagePath } from 'publint/utils'
import type { PackCandidate } from './pack-candidate.js'
import type { DoctorDiagnostic } from './types.js'

/**
 * Whether a collector produced an answer at all.
 *
 * A crashed validator, an unsupported package shape and a missing tool are not clean bills of health, so the outcome is
 * kept separate from the findings: an empty finding list under a `failed` outcome must never read as "valid".
 *
 * `not_applicable` is the third state, and it exists because "nothing to examine" and "examined and found nothing" are
 * the same empty finding list. Only the outcome can tell a reader that a collector never had a subject — a package
 * shipping no type declarations gives ATTW nothing to judge, and reporting that as `completed` would let an untyped
 * package read as a package whose types were checked and cleared.
 */
export type CollectorOutcome =
    | Readonly<{ detail: string; state: 'failed' }>
    | Readonly<{ reason: string; state: 'not_applicable' }>
    | Readonly<{ state: 'completed' }>

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
 */
const DEFAULT_RESOLUTIONS: ReadonlyArray<ResolutionKind> = [
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
    const resolutions = options.resolutions ?? DEFAULT_RESOLUTIONS
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

function readField(problem: Problem, field: string): string | undefined {
    const value = (problem as unknown as Record<string, unknown>)[field]
    return typeof value === 'string' ? value : undefined
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
