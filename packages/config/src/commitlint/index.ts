/**
 * Commitlint configuration for use in Monorepo.
 *
 * @see [commitlint - Lint commit messages](https://commitlint.js.org/#/)
 * @see [commitlint-config-conventional - Shareable commitlint config](https://www.npmjs.com/package/@commitlint/config-conventional)
 * @see [Commitizen](https://commitizen-tools.github.io/commitizen/)
 */
import type { UserConfig as CommitlintUserConfig } from '@commitlint/types'
import type { Writable } from 'type-fest'
import config_conventional from '@commitlint/config-conventional'
import type {LiteralUnion} from 'type-fest';

export type ConventionalCommitType = keyof typeof config_conventional.prompt.questions.type.enum
export const COMMIT_TYPES: ConventionalCommitType[] =Object.keys(config_conventional.prompt.questions.type.enum) as ConventionalCommitType[]

/*[
    'feat',
    'fix',
    'wip',
    'build',
    'chore',
    'docs',
    'release',
    'ci',
    'perf',
    'refactor',
    'revert',
    'style',
    'test',
]*/
export const configuration = (
    scope_enum: Array<string> = [],
    type_enum: Array<LiteralUnion<ConventionalCommitType,string>> = COMMIT_TYPES as ConventionalCommitType[] ,
): CommitlintUserConfig => {
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
            'scope-empty': [2, 'never'],
            'scope-enum': [2, 'always', scope_enum],
            'type-enum': [2, 'always', type_enum],
        },
    }
    return baseConfig
}

/** @ignore */
export const commitlint = {
    commit_types: COMMIT_TYPES,
    configuration,
}

export type { UserConfig as CommitlintUserConfig } from '@commitlint/types'
