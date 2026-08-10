import {
    type CONFIG_ENVIRONMENT_DEFAULTS,
    readConfigEnvironment,
} from './environment.js'
import { resolvePackageManager } from './package-manager.js'

export type EnvironmentReportOptions = {
    environment?: NodeJS.ProcessEnv
    title?: string
}

type EnvironmentReportRow = readonly [
    variable: string,
    value: string,
    source: string,
]

/** Build a deterministic, dependency-free report of public config environment inputs. */
export function formatEnvironmentReport(
    repoRoot: string,
    options: EnvironmentReportOptions = {},
): string {
    const environment = options.environment ?? process.env
    const resolved = readConfigEnvironment(environment)
    const packageManager = resolvePackageManager(repoRoot, environment)
    const rows: Array<EnvironmentReportRow> = [
        row(
            'PACKAGE_MANAGER',
            packageManager.packageManager,
            packageManager.source,
        ),
        row(
            'SKIP_LINT_STAGED',
            resolved.skipLintStaged,
            valueSource(environment, 'SKIP_LINT_STAGED'),
        ),
        row(
            'PROTECTED_BRANCHES',
            resolved.protectedBranches.join(','),
            valueSource(environment, 'PROTECTED_BRANCHES'),
        ),
        row(
            'SCOPE_COMMIT_SKIP_COMMITLINT',
            resolved.skipCommitlint,
            valueSource(environment, 'SCOPE_COMMIT_SKIP_COMMITLINT'),
        ),
        row(
            'ALLOW_DIRTY',
            resolved.allowDirty,
            valueSource(environment, 'ALLOW_DIRTY'),
        ),
        row(
            'BASE_BRANCH',
            resolved.baseBranch,
            valueSource(environment, 'BASE_BRANCH'),
        ),
        row('PREFIX', resolved.prefix, valueSource(environment, 'PREFIX')),
        row(
            'PREFIX_OVERRIDE',
            resolved.prefixOverride,
            valueSource(environment, 'PREFIX_OVERRIDE'),
        ),
        row('LOGGING', resolved.logging, valueSource(environment, 'LOGGING')),
        row(
            'COMMAND_NAME',
            resolved.commandName,
            valueSource(environment, 'COMMAND_NAME'),
        ),
        row(
            'GBT_PATCH_CWD',
            resolved.patchCwd,
            valueSource(environment, 'GBT_PATCH_CWD'),
        ),
    ]

    const headers: EnvironmentReportRow = ['VARIABLE', 'VALUE', 'SOURCE']
    const widths = headers.map((header, index) =>
        Math.max(
            header.length,
            ...rows.map((reportRow) => reportRow[index].length),
        ),
    )
    const formatRow = (reportRow: EnvironmentReportRow): string =>
        reportRow
            .map((cell, index) => cell.padEnd(widths[index] ?? cell.length))
            .join('  ')
            .trimEnd()
    const divider = widths.map((width) => '-'.repeat(width)).join('  ')

    return [
        options.title ?? 'Environment variables',
        formatRow(headers),
        divider,
        ...rows.map(formatRow),
    ].join('\n')
}

function row(
    variable: string,
    value: boolean | string,
    source: string,
): EnvironmentReportRow {
    return [variable, String(value) || '(empty)', source]
}

function valueSource(
    environment: NodeJS.ProcessEnv,
    variable: keyof typeof CONFIG_ENVIRONMENT_DEFAULTS,
): string {
    return environment[variable] === undefined ? 'default' : 'environment'
}
