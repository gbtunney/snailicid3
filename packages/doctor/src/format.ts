import type { DoctorDiagnostic, DoctorReport } from './types.js'

/** Format the complete report as stable, machine-readable JSON. */
export function formatDoctorJson(report: DoctorReport): string {
    return JSON.stringify(report, undefined, 2)
}

/** Format a concise terminal report without mutating package or process state. */
export function formatDoctorText(report: DoctorReport): string {
    const { summary } = report
    const lines = [
        '🐌 Snailicid3 Doctor',
        `Root: ${report.root}`,
        `Scanned ${formatCount(summary.packages, 'package')}; found ${formatCount(summary.findings, 'diagnostic')} (${formatCount(summary.knownFixtureFindings, 'known-fixture finding')}, ${formatCount(summary.unregisteredFindings, 'unregistered finding')}).`,
    ]

    if (report.diagnostics.length === 0) {
        lines.push('', 'No findings.')
    } else {
        for (const diagnostic of report.diagnostics) {
            lines.push('', formatDiagnosticHeading(diagnostic))

            for (const evidence of diagnostic.evidence) {
                lines.push(`  - ${evidence}`)
            }
        }
    }

    lines.push('', 'Read-only report: no files were changed.')
    return lines.join('\n')
}

function formatCount(count: number, noun: string): string {
    return `${String(count)} ${noun}${count === 1 ? '' : 's'}`
}

function formatDiagnosticHeading(diagnostic: DoctorDiagnostic): string {
    const fixture = diagnostic.fixtureId
        ? ` [known fixture ${diagnostic.fixtureId}]`
        : ' [unregistered]'
    const marker = diagnostic.severity === 'error' ? '✖' : '⚠'

    return `${marker} ${diagnostic.packageName} ${diagnostic.code}${fixture}: ${diagnostic.message}`
}
