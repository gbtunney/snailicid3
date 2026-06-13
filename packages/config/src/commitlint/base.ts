import config_conventional from '@commitlint/config-conventional'
import type { UserConfig as CommitlintConfig } from '@commitlint/types'

export const commitlintDefaultConfig: CommitlintConfig = {
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
    },
}
