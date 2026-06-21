import type { UserConfig as CommitlintUserConfig } from '@commitlint/types'
import { merge as deepMerge } from 'ts-deepmerge'
import type { LiteralUnion } from 'type-fest'
import { commitlintDefaultConfig } from './base.js'
import { COMMIT_TYPES, type ConventionalCommitType } from './types.js'
import {
    workspaceScopes,
    type WorkspaceScopesOptions,
} from './workspace.scopes.js'
import { type ConfigFunctionOptions, defineConfig } from '../core/index.js'

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

export const buildFunctionCommitlint = ({
    appendScopes,
    appendTypes = [],
    overrides = {},
    scopeOptions,
}: CommitlintConfigFunctionOptions = {}): CommitlintConfig => {
    const scopes = workspaceScopes(appendScopes ?? scopeOptions)
    const typeEnum = [...new Set([...COMMIT_TYPES, ...appendTypes])]

    const enumRules = {
        rules: {
            'scope-enum': [2, 'always', scopes],
            'type-enum': [2, 'always', typeEnum],
        },
    } satisfies CommitlintConfig

    return deepMerge.withOptions(
        { mergeArrays: false },
        commitlintDefaultConfig,
        enumRules,
        overrides,
    )
}
