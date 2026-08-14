import type { UserConfig as CommitlintUserConfig } from '@commitlint/types'
import {
    getWorkspaceScopes,
    getWorkspaceSnapshot,
    SNAILICID3_COMMITLINT_CONFIG_KEY,
} from '@snailicid3/workspace'
import { merge as deepMerge } from 'ts-deepmerge'
import type { LiteralUnion } from 'type-fest'
import { commitlintDefaultConfig } from './base.js'
import { COMMIT_TYPES, type ConventionalCommitType } from './types.js'
import type { WorkspaceScopesOptions } from './workspace.scopes.js'
import {
    type ConfigFunctionOptions,
    defineConfig,
    defineConfigBuilder,
} from '../core/index.js'

export type CommitlintConfig = CommitlintUserConfig

export type CommitlintConfigFunctionOptions = ConfigFunctionOptions<{
    /** Forwarded to `workspaceScopes()` for the `scope-enum` rule. */
    appendScopes?: WorkspaceScopesOptions
    /** Appended to `commitTypes` for the `type-enum` rule. */
    appendTypes?: Array<LiteralUnion<ConventionalCommitType, string>>
    /** Merged on top of the default config and computed enum rules. */
    overrides?: CommitlintConfig
    /** Backwards-compatible alias for `appendScopes`. */
    scopeOptions?: WorkspaceScopesOptions
}>

export const defineCommitlintConfig = <const TConfig extends CommitlintConfig>(
    config: TConfig,
): TConfig => defineConfig(config)

export const buildFunctionCommitlint = defineConfigBuilder<
    CommitlintConfig,
    CommitlintConfigFunctionOptions
>(({ appendScopes, appendTypes = [], overrides = {}, scopeOptions }) => {
    const resolvedScopeOptions = appendScopes ?? scopeOptions
    const typeEnum = [...new Set([...COMMIT_TYPES, ...appendTypes])]

    // Published metadata is the consumer's overrides, never the resolved result. Packages and
    // standard scopes are derivable from the workspace, and republishing them under shortened names
    // fed straight back into the CLI as overrides — which then merged with the --keep-prefix names
    // and emitted both spellings of the same scope.
    const scopeOverrides = {
        ...resolvedScopeOptions?.matchers,
        ...Object.fromEntries(
            (resolvedScopeOptions?.mergeScopes ?? []).map(
                (scope) => [scope, true] as const,
            ),
        ),
    }
    const resolved = getWorkspaceScopes({
        keepPrefix: resolvedScopeOptions?.keepPrefix ?? false,
        overrides: scopeOverrides,
        snapshot: getWorkspaceSnapshot(),
    })

    const enumRules = {
        rules: {
            'scope-enum': [2, 'always', resolved.names],
            'type-enum': [2, 'always', typeEnum],
        },
        [SNAILICID3_COMMITLINT_CONFIG_KEY]: {
            scopeMatchers: scopeOverrides,
        },
    } satisfies CommitlintConfig

    return deepMerge.withOptions(
        { mergeArrays: false },
        commitlintDefaultConfig,
        enumRules,
        overrides,
    )
})
