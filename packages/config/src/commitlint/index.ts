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
import { type ConfigApi, defineConfig } from '../core/index.js'

export type ConventionalCommitType =
    keyof typeof config_conventional.prompt.questions.type.enum
export const CONVENTIONAL_COMMIT_TYPES: Array<ConventionalCommitType> =
    Object.keys(config_conventional.prompt.questions.type.enum).filter(
        (_key: string): boolean => {
            return _key === 'ci' || _key === 'perf' ? false : true
        },
    ) as Array<ConventionalCommitType>

export const COMMIT_TYPES: Array<LiteralUnion<ConventionalCommitType, string>> =
    [...CONVENTIONAL_COMMIT_TYPES, 'changeset', 'release'] as const
/** [ 'feat', 'fix', 'build', 'chore', 'docs', 'release', 'perf', 'refactor', 'revert', 'style', 'test', ] */

export type CommitlintConfigOptions = {
    /** Appended to `commitTypes` for the `type-enum` rule (array concat). */
    appendTypes?: Array<LiteralUnion<ConventionalCommitType, string>>
    /** Reserved for future workspace-discovery cwd support. Defaults to `process.cwd()`. */
    cwd?: string
    /** Forwarded to `workspaceScopes()` for the `scope-enum` rule. */
    scopeOptions?: WorkspaceScopesOptions
}

/**
 * Builds the recommended commitlint config (extends `@commitlint/config-conventional`).
 *
 * - `appendTypes`: appended to `commitTypes` for the `type-enum` rule.
 * - `scopeOptions`: forwarded to `workspaceScopes()` to compute `scope-enum`.
 * - `cwd`: reserved for future workspace-discovery cwd support; currently unused.
 *
 * `prompt` and the conventional-commit base rules are fixed.
 */
const buildCommitlintConfig = ({
    appendTypes = [],
    scopeOptions = {},
}: CommitlintConfigOptions = {}): CommitlintUserConfig => {
    const type_enum = [...COMMIT_TYPES, ...appendTypes]
    const _scopes = workspaceScopes(scopeOptions)

    return {
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
}

export const Commitlint: ConfigApi<
    CommitlintUserConfig,
    CommitlintConfigOptions,
    {
        commitTypes: typeof COMMIT_TYPES
        workspaceScopes: typeof workspaceScopes
        workspaceScopesCsv: typeof workspaceScopesCsv
    }
> = {
    commitTypes: COMMIT_TYPES,
    config: buildCommitlintConfig,
    defineConfig,
    workspaceScopes,
    workspaceScopesCsv,
}

export type { UserConfig as CommitlintUserConfig } from '@commitlint/types'
