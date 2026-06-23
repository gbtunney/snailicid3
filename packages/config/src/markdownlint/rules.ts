import { merge } from 'ts-deepmerge'
import { getBaseConfig } from './base.config.js'
import type { MarkdownlintRuleConfiguration } from './schema.js'
import { defineConfig } from '../core/index.js'

export const defineMarkdownlintRules = <
    const TConfig extends MarkdownlintRuleConfiguration,
>(
    rules: TConfig,
): TConfig => defineConfig(rules)

export const getMergedRuleConfiguration = (
    overrides: MarkdownlintRuleConfiguration,
    useBaseConfig = true,
): MarkdownlintRuleConfiguration => {
    if (!useBaseConfig) return overrides
    return merge(getBaseConfig(), overrides)
}

export type { MarkdownlintRuleConfiguration } from './schema.js'
