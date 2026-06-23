import { describe, expect, test } from 'vitest'
import { getBaseConfig } from './base.config.js'
import {
    getMergedRuleConfiguration,
    type MarkdownlintRuleConfiguration,
} from './rules.js'
import { Markdownlint } from './index.js'

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

const ALLOWED_MD013_KEYS = new Set<string>([
    'line_length',
    'line-length',
    'code_block_line_length',
    'code_blocks',
    'heading_line_length',
    'headings',
    'strict',
    'tables',
])

function extractMd013Options(
    cfg: unknown,
): Record<string, unknown> | undefined {
    // Accept a couple of possible shapes the helper may return
    // e.g. { rules: { MD013: { ... }}} or similar
    const anyCfg = cfg as any
    return anyCfg?.rules?.MD013 ?? anyCfg?.rules?.['MD013'] ?? undefined
}

describe('markdownlint MD013 option keys', () => {
    test('allows known keys for MD013', () => {
        const cfg = Markdownlint.config({
            rules: { MD013: { line_length: 60 } },
        })
        const opts = extractMd013Options(cfg)
        expect(opts).toBeDefined()
        const keys = Object.keys(opts ?? {})
        expect(keys.every((k) => ALLOWED_MD013_KEYS.has(k))).toBe(true)
    })

    test('detects misspelled / unknown keys (e.g. "line-ength")', () => {
        const cfg = Markdownlint.config({
            rules: {
                MD013: {
                    // @ts-expect-error intentionally exercises runtime detection for unknown keys
                    'line-ength': 60,
                },
            },
        })
        const opts = extractMd013Options(cfg)
        expect(opts).toBeDefined()
        const keys = Object.keys(opts ?? {})
        const unknown = keys.filter((k) => !ALLOWED_MD013_KEYS.has(k))
        // Test will fail if unknown keys are present; assert that the misspelled key is detected
        expect(unknown.length).toBeGreaterThan(0)
        expect(unknown).toContain('line-ength')
    })
})
