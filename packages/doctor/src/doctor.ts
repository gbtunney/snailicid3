import path from 'node:path'
import { discoverPackageRoots, type DiscoveryOptions } from './discovery.js'
import { analyzePackage } from './manifest.js'
import type { DoctorPackageReport, DoctorReport } from './types.js'

export type RunDoctorOptions = Readonly<{
    discovery?: DiscoveryOptions
    packageNames?: ReadonlyArray<string>
    root?: string
}>

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
