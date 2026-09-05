import type { ResolutionKind } from '@arethetypeswrong/core'
import path from 'node:path'
import { discoverPackageRoots, type DiscoveryOptions } from './discovery.js'
import { analyzePackage } from './manifest.js'
import { withPackCandidate } from './pack-candidate.js'
import { validatePackedCandidate } from './packed-validation.js'
import type {
    DoctorDiagnostic,
    DoctorPackageReport,
    DoctorReport,
    PackedValidationEvidence,
} from './types.js'

export type RunDoctorOptions = Readonly<{
    discovery?: DiscoveryOptions
    packageNames?: ReadonlyArray<string>
    root?: string
}>

export type RunDoctorWithPackedValidationOptions = Readonly<{
    /** Resolution modes ATTW judges against; defaults to the packed validator's Node16 CJS + ESM profile. */
    resolutions?: ReadonlyArray<ResolutionKind>
}> &
    RunDoctorOptions

/** Run the read-only package collectors and return a deterministic report. */
export function runDoctor(options: RunDoctorOptions = {}): DoctorReport {
    const root = path.resolve(options.root ?? process.cwd())
    const packageNameFilter = new Set(options.packageNames ?? [])
    const packageReports = discoverPackageRoots(root, options.discovery)
        .map(analyzePackage)
        .filter(
            (report) =>
                packageNameFilter.size === 0 ||
                packageNameFilter.has(report.packageName),
        )
        .toSorted((left, right) =>
            left.packageName.localeCompare(right.packageName),
        )

    if (packageNameFilter.size > 0) {
        assertRequestedPackagesFound(packageNameFilter, packageReports)
    }

    return summarize(packageReports, root)
}

/**
 * Run the source collectors, then validate each selected package's publication candidate.
 *
 * This is the CLI's path, and it is a stage on top of {@link runDoctor} rather than a second runner: the synchronous
 * source collectors run exactly once, inside it, and selection is resolved from their output before anything is packed.
 * Asking for one package therefore packs one package, not the workspace.
 *
 * Each selected package is packed once. Publint and ATTW both read that single candidate, so the two can never describe
 * different bytes, and the candidate is disposed whether validation succeeds or throws.
 */
export async function runDoctorWithPackedValidation(
    options: RunDoctorWithPackedValidationOptions = {},
): Promise<DoctorReport> {
    const sourceReport = runDoctor(options)

    // Sequential rather than concurrent: packing shells out to a package manager per package, and a workspace-wide
    // run would otherwise start one subprocess per package at once.
    const packages: Array<DoctorPackageReport> = []
    for (const packageReport of sourceReport.packages) {
        packages.push(await withPackedValidation(packageReport, options))
    }

    return summarize(packages, sourceReport.root)
}

function assertRequestedPackagesFound(
    requested: ReadonlySet<string>,
    packageReports: ReadonlyArray<DoctorPackageReport>,
): void {
    const found = new Set(packageReports.map((report) => report.packageName))
    const missing = [...requested].filter(
        (packageName) => !found.has(packageName),
    )

    if (missing.length > 0) {
        throw new Error(`Requested packages not found: ${missing.join(', ')}`)
    }
}

function describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

function packCandidateFailure(
    packageReport: DoctorPackageReport,
    error: unknown,
): DoctorDiagnostic {
    return {
        code: 'PACK_CANDIDATE_FAILED',
        evidence: [`packageRoot:${packageReport.packageRoot}`],
        message: `Could not prepare a publication candidate: ${describe(error)}`,
        packageName: packageReport.packageName,
        packageRoot: packageReport.packageRoot,
        severity: 'error',
    }
}

/**
 * Build the report envelope from per-package reports.
 *
 * Shared by both runners so the top-level list and the summary counts are derived from the package reports once.
 * Packed-validator findings live in their package's `diagnostics`, so they are flattened here exactly like every other
 * finding and counted exactly once.
 */
function summarize(
    packageReports: ReadonlyArray<DoctorPackageReport>,
    root: string,
): DoctorReport {
    const diagnostics = packageReports.flatMap((report) => report.diagnostics)
    const knownFixtureFindings = diagnostics.filter(
        (diagnostic) => diagnostic.fixtureId !== undefined,
    ).length

    return {
        diagnostics,
        packages: packageReports,
        root,
        summary: {
            findings: diagnostics.length,
            knownFixtureFindings,
            packages: packageReports.length,
            unregisteredFindings: diagnostics.length - knownFixtureFindings,
        },
    }
}

/** Both collectors report failure when packing never produced an artifact for them to read. */
function unpackable(detail: string): PackedValidationEvidence {
    const outcome = { detail, state: 'failed' } as const
    return { attw: outcome, files: [], publint: outcome, resolutions: [] }
}

/** Add packed-validation findings and evidence to one already-analyzed package. */
async function withPackedValidation(
    packageReport: DoctorPackageReport,
    options: RunDoctorWithPackedValidationOptions,
): Promise<DoctorPackageReport> {
    try {
        return await withPackCandidate(
            { packageRoot: packageReport.packageRoot },
            async (candidate) => {
                const result = await validatePackedCandidate(
                    candidate,
                    options.resolutions
                        ? { resolutions: options.resolutions }
                        : {},
                )

                return {
                    ...packageReport,
                    diagnostics: [
                        ...packageReport.diagnostics,
                        ...result.diagnostics,
                    ],
                    packedValidation: {
                        attw: result.attw,
                        files: result.files,
                        publint: result.publint,
                        resolutions: result.resolutions,
                    },
                }
            },
        )
    } catch (error) {
        // A package that cannot be packed at all is a finding about that package, not a reason to abandon the run:
        // one unpackable package must not cost the report every other package's diagnostics.
        return {
            ...packageReport,
            diagnostics: [
                ...packageReport.diagnostics,
                packCandidateFailure(packageReport, error),
            ],
            packedValidation: unpackable(describe(error)),
        }
    }
}
