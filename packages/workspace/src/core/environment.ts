import { defineEnv } from '@snailicid3/node-utils'
import { z } from 'zod'

const booleanEnvironmentValue = (defaultValue: boolean): z.ZodType<boolean> =>
    z.stringbool().default(defaultValue)

const listEnvironmentValue = (
    defaultValue: ReadonlyArray<string>,
): z.ZodType<Array<string>> =>
    z
        .string()
        .default(defaultValue.join(','))
        .transform((value) => [
            ...new Set(
                value
                    .split(',')
                    .map((entry) => entry.trim())
                    .filter(Boolean),
            ),
        ])

/** Snailicid3 environment policy built on node-utils' source-agnostic Zod parser. */
export const workspaceEnvironment = defineEnv({
    allowDirty: booleanEnvironmentValue(false),
    baseBranch: z.string().default(''),
    commandName: z.string().default('gbt-exec'),
    logging: booleanEnvironmentValue(false),
    packageManagerOverride: z
        .enum(['npm', 'pnpm'])
        .optional()
        .meta({ environmentKey: 'PACKAGE_MANAGER' }),
    patchCwd: z.string().default('').meta({ environmentKey: 'GBT_PATCH_CWD' }),
    prefix: z.string().default('changeset'),
    prefixOverride: z.string().default(''),
    protectedBranches: listEnvironmentValue(['main', 'master']),
    skipCommitlint: booleanEnvironmentValue(false).meta({
        environmentKey: 'SCOPE_COMMIT_SKIP_COMMITLINT',
    }),
    skipLintStaged: booleanEnvironmentValue(false),
})

export type WorkspaceEnvironment = z.output<typeof workspaceEnvironment.schema>

/** Parse the config environment from an explicit source such as process.env or import.meta.env. */
export const readWorkspaceEnvironment = (
    environment: Readonly<Record<string, unknown>>,
): WorkspaceEnvironment => workspaceEnvironment.parse(environment)
