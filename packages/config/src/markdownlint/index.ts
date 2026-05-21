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
type MarkdownlintApi = {
    config: (
        option_overrides?: MarkdownlintRuleConfiguration,
        ignore_overrides?: Array<string>,
        includes?: Array<string>,
        useBaseConfig?: boolean,
    ) => MarkdownlintConfiguration
    rules: {
        baseConfig: () => MarkdownlintRuleConfiguration
        merge: (
            option_overrides?: MarkdownlintRuleConfiguration,
            useBaseConfig?: boolean,
        ) => MarkdownlintRuleConfiguration
    }
}
export const markdownlint: MarkdownlintApi = {
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
        merge: (
            option_overrides: MarkdownlintRuleConfiguration = {},
            useBaseConfig: boolean = true,
        ) => getMergedRuleConfiguration(option_overrides, useBaseConfig),
    },
}

export type {
    MarkdownlintConfiguration,
    MarkdownlintRuleConfiguration,
} from './schema.js'
