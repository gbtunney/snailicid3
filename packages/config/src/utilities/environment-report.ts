import {
    type CONFIG_ENVIRONMENT_DEFAULTS,
    CONFIG_ENVIRONMENT_VARIABLES,
    type ConfigEnvironmentVariable,
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

/** Resolve one registered environment variable to its shell-safe display value. */
export function resolveEnvironmentVariable(
    repoRoot: string,
    variable: ConfigEnvironmentVariable,
    environment: NodeJS.ProcessEnv = process.env,
): string {
    if (variable === CONFIG_ENVIRONMENT_VARIABLES.packageManager) {
        return resolvePackageManager(repoRoot, environment).packageManager
    }

    const resolved = readConfigEnvironment(environment)
    const values: Record<
        Exclude<ConfigEnvironmentVariable, 'PACKAGE_MANAGER'>,
        boolean | ReadonlyArray<string> | string
    > = {
        ALLOW_DIRTY: resolved.allowDirty,
        BASE_BRANCH: resolved.baseBranch,
        COMMAND_NAME: resolved.commandName,
        GBT_PATCH_CWD: resolved.patchCwd,
        LOGGING: resolved.logging,
        PREFIX: resolved.prefix,
        PREFIX_OVERRIDE: resolved.prefixOverride,
        PROTECTED_BRANCHES: resolved.protectedBranches,
        SCOPE_COMMIT_SKIP_COMMITLINT: resolved.skipCommitlint,
        SKIP_LINT_STAGED: resolved.skipLintStaged,
    }
    const value = values[variable]

    return Array.isArray(value) ? value.join(',') : String(value)
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
