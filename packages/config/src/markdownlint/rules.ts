import { merge } from 'ts-deepmerge'
import { getBaseConfig } from './base.config.js'
import type { MarkdownlintRuleConfiguration } from './schema.js'

export const getMergedRuleConfiguration = (
    overrides: MarkdownlintRuleConfiguration,
    useBaseConfig = true,
): MarkdownlintRuleConfiguration => {
    if (!useBaseConfig) return overrides
    return merge(getBaseConfig(), overrides) as MarkdownlintRuleConfiguration
}

export type { MarkdownlintRuleConfiguration } from './schema.js'
