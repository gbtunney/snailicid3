import { getBaseConfig } from './base.config.js'
import { getMergedRuleConfiguration } from './rules.js'
import type { MarkdownlintConfiguration, MarkdownlintRuleConfiguration } from './schema.js'

const BASE_IGNORES = [
    '**/node_modules/**',
    '**/{.changeset,docs,.history,scratch,}/**',
]

export const markdownlint = {
    config: {
        get: (
            overrides: MarkdownlintRuleConfiguration = {},
            useBaseConfig = true,
        ): MarkdownlintConfiguration => ({
            config: getMergedRuleConfiguration(overrides, useBaseConfig),
        }),
    },
    ignores: (overrides: string[] = []): string[] => [...BASE_IGNORES, ...overrides],
    rules: {
        merge: getMergedRuleConfiguration,
        baseConfig: getBaseConfig,
    },
}

export type { MarkdownlintConfiguration, MarkdownlintRuleConfiguration } from './schema.js'
