import { describe, expect, test } from 'vitest'
import { getBaseConfig } from './base.config.js'
import { getMergedRuleConfiguration, type MarkdownlintRuleConfiguration } from './rules.js'

describe('markdownlint rule configuration', () => {
    test('merges overrides with base config', () => {
        const overrides: MarkdownlintRuleConfiguration = {
            MD001: false,
            MD003: { style: 'atx' },
        }
        const result = getMergedRuleConfiguration(overrides)
        expect(result).toHaveProperty('MD014')
        expect(result).toHaveProperty('default', true)
        expect(result.MD001).toBe(false)
    })

    test('without base config omits base rules', () => {
        const overrides: MarkdownlintRuleConfiguration = { MD001: false }
        const result = getMergedRuleConfiguration(overrides, false)
        expect(result).not.toHaveProperty('MD014')
        expect(result.MD001).toBe(false)
    })

    test('base config has correct MD013 code_block_line_length', () => {
        const base = getBaseConfig()
        expect((base.MD013 as any)?.code_block_line_length).toEqual(120)
    })
})
