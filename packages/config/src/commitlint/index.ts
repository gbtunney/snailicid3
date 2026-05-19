/**
 * Commitlint configuration for use in Monorepo.
 *
 * @see [commitlint - Lint commit messages](https://commitlint.js.org/#/)
 * @see [commitlint-config-conventional - Shareable commitlint config](https://www.npmjs.com/package/@commitlint/config-conventional)
 */
import config_conventional from '@commitlint/config-conventional'
import type { UserConfig as CommitlintUserConfig } from '@commitlint/types'
import type { LiteralUnion } from 'type-fest'
import {
    workspaceScopes,
    workspaceScopesCsv,
    type WorkspaceScopesOptions,
} from './workspace.scopes.js'

export type ConventionalCommitType =
    keyof typeof config_conventional.prompt.questions.type.enum
export const CONVENTIONAL_COMMIT_TYPES: Array<ConventionalCommitType> =
    Object.keys(config_conventional.prompt.questions.type.enum).filter(
        (_key: string): boolean => {
            return _key === 'ci' || _key === 'perf' ? false : true
        },
    ) as Array<ConventionalCommitType>

export const COMMIT_TYPES: Array<LiteralUnion<ConventionalCommitType, string>> =
    [...CONVENTIONAL_COMMIT_TYPES, 'wip', 'release'] as const
/** [ 'feat', 'fix', 'wip', 'build', 'chore', 'docs', 'release', 'ci', 'perf', 'refactor', 'revert', 'style', 'test', ] */

export const configuration = (
    scope_options: WorkspaceScopesOptions = {},
    append_type_enum: Array<LiteralUnion<ConventionalCommitType, string>> = [],
): CommitlintUserConfig => {
    const type_enum = [...COMMIT_TYPES, ...append_type_enum]

    const _scopes = workspaceScopes(scope_options)
    const baseConfig: CommitlintUserConfig = {
        extends: ['@commitlint/config-conventional'],
        prompt: {
            messages: {
                emptyWarning: 'can not be empty',
                lowerLimitWarning: 'below limit',
                max: 'upper %d chars',
                min: '%d chars at least',
                skip: ':skip',
                upperLimitWarning: 'over limit',
            },
            questions: config_conventional.prompt.questions,
            settings: { enableMultipleScopes: true, scopeEnumSeparator: ',' },
        },
        rules: {
            'header-max-length': [2, 'always', 150],
            'scope-empty': [2, 'never'],
            'scope-enum': [2, 'always', _scopes],
            'type-enum': [2, 'always', type_enum],
        },
    }
    return baseConfig
}

export type Commitlint = {
    commit_types: typeof COMMIT_TYPES
    configuration: typeof configuration
    workspaceScopes: typeof workspaceScopes
    workspaceScopesCsv: typeof workspaceScopesCsv
}

/** @ignore */
export const commitlint: Commitlint = {
    commit_types: COMMIT_TYPES,
    configuration,
    workspaceScopes,
    workspaceScopesCsv,
}

export type { UserConfig as CommitlintUserConfig } from '@commitlint/types'
