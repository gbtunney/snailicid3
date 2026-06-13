/**
 * Commitlint configuration for use in Monorepo.
 *
 * @see [commitlint - Lint commit messages](https://commitlint.js.org/#/)
 * @see [commitlint-config-conventional - Shareable commitlint config](https://www.npmjs.com/package/@commitlint/config-conventional)
 */
import config_conventional from '@commitlint/config-conventional'
import type { UserConfig as CommitlintUserConfig,RuleConfig } from '@commitlint/types'
import {ConventionalCommitType,COMMIT_TYPES}from "./types.js"
import type { LiteralUnion,OmitDeep } from 'type-fest'
import {
    workspaceScopes,
    workspaceScopesCsv,
    type WorkspaceScopesOptions,
} from './workspace.scopes.js'
import {
    type ConfigToolApi,
    type IdentityDefineConfig,
    defineConfig, ConfigFunctionOptions
} from '../core/define-config.js'
import {merge as deep_merge} from 'ts-deepmerge'
import {commitlintDefaultConfig}from './base.js'
import { PlainObject } from '../utilities/json.js';
/** 
 * Exported: Each 'tool' should export <ToolPascalCase>ConfigFunctionOptions ie CommitlintConfigFunctionOptions which is the options passed into the helper function.
 * Exported: true tool config object <ToolPascalCase>Config 
 * a defineConfig function w tool name defineCommitlintConfig 
 *  a build<ToolPascalCase>ConfigFunction function that takes the options and returns a true config object for the 'tool'
 *  Exported: an object export ConfigToolApi which includes the above and any extra exports (e.g. constants, helper functions) as properties.
 */
export type CommitlintConfigFunctionOptions = ConfigFunctionOptions<{
    /** Appended to `commitTypes` for the `type-enum` rule (array concat). */
    appendTypes?: Array<LiteralUnion<ConventionalCommitType, string>>
    /** Reserved for future workspace-discovery cwd support. Defaults to `process.cwd()`. */
    cwd?: string
    /** Forwarded to `workspaceScopes()` for the `scope-enum` rule. */
    appendScopes?: WorkspaceScopesOptions
    /** overrides: merge on top of config */
    overrides?: CommitlintConfig 

}>
export type  CommitlintConfig = CommitlintUserConfig

export const defineCommitlintConfig = <
    const TConfig extends CommitlintUserConfig,
>(
    config: TConfig,
): TConfig => defineConfig(config)

/**
 * Builds the recommended commitlint config (extends `@commitlint/config-conventional`).
 *
 * - `cwd`: reserved for future workspace-discovery cwd support; currently unused.
 * - `appendTypes`: appended to `commitTypes` for the `type-enum` rule.
 * - `appendScopes`: forwarded to `workspaceScopes()` to compute `scope-enum`.
 * - `overrride` ( merge on top of config)
 * `prompt` and the conventional-commit base rules are fixed.
 */
const buildCommitlintConfigFunction = ({
    appendTypes = [],
    appendScopes = {},
    overrides ={} 
}: CommitlintConfigFunctionOptions = {}): CommitlintUserConfig => {
    /** uses my default commit types, which exclude "ci" and "perf" and add release and changeset.*/
    const _scopes = workspaceScopes(appendScopes)
    const typeEnum = [...new Set([...COMMIT_TYPES, ...appendTypes])]

 const enum_rules: PlainObject = { rules: {
            'scope-enum': [2, 'always', _scopes],
            'type-enum': [2, 'always', typeEnum],  } }
    const mergeResult :CommitlintConfig= deep_merge.withOptions(  { mergeArrays: false }, enum_rules,overrides)
   
    return mergeResult
    }


export const Commitlint = {
    commitTypes: COMMIT_TYPES,
    config: buildCommitlintConfigFunction,
     defineConfig: defineCommitlintConfig,
    workspaceScopes,
    workspaceScopesCsv,
} satisfies ConfigToolApi<
    CommitlintUserConfig,
    CommitlintConfigFunctionOptions,
    IdentityDefineConfig<CommitlintUserConfig>,
    {
        commitTypes: typeof COMMIT_TYPES
        workspaceScopes: typeof workspaceScopes
        workspaceScopesCsv: typeof workspaceScopesCsv
    }
>