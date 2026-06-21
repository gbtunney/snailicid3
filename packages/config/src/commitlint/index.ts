import {
    buildFunctionCommitlint,
    type CommitlintConfig,
    type CommitlintConfigFunctionOptions,
    defineCommitlintConfig,
} from './api-functions.js'
import { COMMIT_TYPES, filterCommitTypes } from './types.js'
import { workspaceScopes, workspaceScopesCsv } from './workspace.scopes.js'
import {
    type ConfigTool,
    type ConfigToolApi,
    defineConfigTool,
    type IdentityDefineConfig,
} from '../core/index.js'

export const Commitlint = defineConfigTool({
    commitTypes: COMMIT_TYPES,
    config: buildFunctionCommitlint,
    defineConfig: defineCommitlintConfig,
    filterCommitTypes,
    workspaceScopes,
    workspaceScopesCsv,
} satisfies ConfigToolApi<
    CommitlintConfig,
    CommitlintConfigFunctionOptions,
    IdentityDefineConfig<CommitlintConfig>,
    {
        commitTypes: typeof COMMIT_TYPES
        filterCommitTypes: typeof filterCommitTypes
        workspaceScopes: typeof workspaceScopes
        workspaceScopesCsv: typeof workspaceScopesCsv
    }
>)

export type CommitlintTool = ConfigTool<
    CommitlintConfig,
    CommitlintConfigFunctionOptions,
    typeof Commitlint.defineConfig,
    Omit<typeof Commitlint, 'config' | 'defineConfig'>
>

export type {
    CommitlintConfig,
    CommitlintConfigFunctionOptions,
} from './api-functions.js'

export {
    COMMIT_TYPES,
    type CommitType,
    type ConventionalCommitType,
    filterCommitTypes,
} from './types.js'

export {
    workspaceScopes,
    workspaceScopesCsv,
    type WorkspaceScopesOptions,
} from './workspace.scopes.js'
