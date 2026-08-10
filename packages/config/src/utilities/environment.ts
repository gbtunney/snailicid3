export const CONFIG_ENVIRONMENT_VARIABLES = {
    allowDirty: 'ALLOW_DIRTY',
    baseBranch: 'BASE_BRANCH',
    commandName: 'COMMAND_NAME',
    logging: 'LOGGING',
    packageManager: 'PACKAGE_MANAGER',
    patchCwd: 'GBT_PATCH_CWD',
    prefix: 'PREFIX',
    prefixOverride: 'PREFIX_OVERRIDE',
    protectedBranches: 'PROTECTED_BRANCHES',
    skipCommitlint: 'SCOPE_COMMIT_SKIP_COMMITLINT',
    skipLintStaged: 'SKIP_LINT_STAGED',
} as const

export type ConfigEnvironment = {
    allowDirty: boolean
    baseBranch: string
    commandName: string
    logging: boolean
    packageManagerOverride?: PackageManager
    patchCwd: string
    prefix: string
    prefixOverride: string
    protectedBranches: Array<string>
    skipCommitlint: boolean
    skipLintStaged: boolean
}

export type ConfigEnvironmentVariable =
    (typeof CONFIG_ENVIRONMENT_VARIABLES)[keyof typeof CONFIG_ENVIRONMENT_VARIABLES]

export type PackageManager = 'npm' | 'pnpm'

export const CONFIG_ENVIRONMENT_DEFAULTS = {
    ALLOW_DIRTY: false,
    BASE_BRANCH: '',
    COMMAND_NAME: 'gbt-exec',
    GBT_PATCH_CWD: '',
    LOGGING: false,
    PACKAGE_MANAGER: undefined,
    PREFIX: 'changeset',
    PREFIX_OVERRIDE: '',
    PROTECTED_BRANCHES: ['main', 'master'],
    SCOPE_COMMIT_SKIP_COMMITLINT: false,
    SKIP_LINT_STAGED: false,
} as const satisfies Record<ConfigEnvironmentVariable, unknown>

/** Parse the supported boolean environment syntax, rejecting ambiguous values. */
export function parseEnvironmentBoolean(
    name: ConfigEnvironmentVariable,
    value: string | undefined,
    defaultValue: boolean,
): boolean {
    if (value === undefined || value === '') return defaultValue

    switch (value.toLowerCase()) {
        case '0':
        case 'false':
            return false
        case '1':
        case 'true':
            return true
        default:
            throw new Error(
                `${name} must be one of: true, false, 1, 0 (received ${JSON.stringify(value)})`,
            )
    }
}

/** Parse a comma-delimited environment list, trimming and removing duplicates. */
export function parseEnvironmentList(
    value: string | undefined,
    defaultValue: ReadonlyArray<string>,
): Array<string> {
    if (value === undefined) return [...defaultValue]

    return [
        ...new Set(
            value
                .split(',')
                .map((entry) => entry.trim())
                .filter(Boolean),
        ),
    ]
}

/** Resolve every public `@snailicid3/config` environment input in one typed object. */
export function readConfigEnvironment(
    environment: NodeJS.ProcessEnv = process.env,
): ConfigEnvironment {
    return {
        allowDirty: parseEnvironmentBoolean(
            'ALLOW_DIRTY',
            environment.ALLOW_DIRTY,
            CONFIG_ENVIRONMENT_DEFAULTS.ALLOW_DIRTY,
        ),
        baseBranch:
            environment.BASE_BRANCH ?? CONFIG_ENVIRONMENT_DEFAULTS.BASE_BRANCH,
        commandName:
            environment.COMMAND_NAME ??
            CONFIG_ENVIRONMENT_DEFAULTS.COMMAND_NAME,
        logging: parseEnvironmentBoolean(
            'LOGGING',
            environment.LOGGING,
            CONFIG_ENVIRONMENT_DEFAULTS.LOGGING,
        ),
        packageManagerOverride: parsePackageManager(
            environment.PACKAGE_MANAGER,
        ),
        patchCwd:
            environment.GBT_PATCH_CWD ??
            CONFIG_ENVIRONMENT_DEFAULTS.GBT_PATCH_CWD,
        prefix: environment.PREFIX ?? CONFIG_ENVIRONMENT_DEFAULTS.PREFIX,
        prefixOverride:
            environment.PREFIX_OVERRIDE ??
            CONFIG_ENVIRONMENT_DEFAULTS.PREFIX_OVERRIDE,
        protectedBranches: parseEnvironmentList(
            environment.PROTECTED_BRANCHES,
            CONFIG_ENVIRONMENT_DEFAULTS.PROTECTED_BRANCHES,
        ),
        skipCommitlint: parseEnvironmentBoolean(
            'SCOPE_COMMIT_SKIP_COMMITLINT',
            environment.SCOPE_COMMIT_SKIP_COMMITLINT,
            CONFIG_ENVIRONMENT_DEFAULTS.SCOPE_COMMIT_SKIP_COMMITLINT,
        ),
        skipLintStaged: parseEnvironmentBoolean(
            'SKIP_LINT_STAGED',
            environment.SKIP_LINT_STAGED,
            CONFIG_ENVIRONMENT_DEFAULTS.SKIP_LINT_STAGED,
        ),
    }
}

function parsePackageManager(
    value: string | undefined,
): PackageManager | undefined {
    if (value === undefined || value === '') return undefined
    if (value === 'npm' || value === 'pnpm') return value

    throw new Error(`Unsupported PACKAGE_MANAGER: ${value}`)
}
