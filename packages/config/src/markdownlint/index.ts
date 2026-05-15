import { getBaseConfig } from './base.config.js'
import { getMergedRuleConfiguration } from './rules.js'
import type {
    MarkdownlintConfiguration,
    MarkdownlintRuleConfiguration,
} from './schema.js'

const BASE_IGNORES = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.history/**',
    '**/.changeset/**',
    '**/docs/**',
    '**/scratch/**',
    '**/etc/**',
    '**/tmp/**',
    '**/.github/instructions/nx.instructions.md',
]

export const markdownlint = {
    config: (
        option_overrides: MarkdownlintRuleConfiguration = {},
        ignore_overrides: Array<string> = [],
        includes: Array<string> = ['**/*.md'],
        useBaseConfig: boolean = true,
    ): MarkdownlintConfiguration => ({
        config: getMergedRuleConfiguration(option_overrides, useBaseConfig),
        globs: includes,
        ignores: [...BASE_IGNORES, ...ignore_overrides],
    }),

    rules: {
        baseConfig: getBaseConfig,
        merge: getMergedRuleConfiguration,
    },
}

export type {
    MarkdownlintConfiguration,
    MarkdownlintRuleConfiguration,
} from './schema.js'
