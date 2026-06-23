import { describe, expect, test } from 'vitest'
import { getBaseConfig } from './base.config.js'
import {
    getMergedRuleConfiguration,
    type MarkdownlintRuleConfiguration,
} from './rules.js'
import { Markdownlint } from './index.js'

const cwd = import.meta

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
    'code_block_line_length',
    'code_blocks',
    'heading_line_length',
    'headings',
    'line-length',
    'line_length',
    'strict',
    'tables',
])

const KNOWN_MD013_RULES = {
    MD013: {
        code_block_line_length: 120,
        line_length: 60,
        tables: false,
    },
} satisfies MarkdownlintRuleConfiguration

const UNKNOWN_MD013_RULES = {
    MD013: {
        // @ts-expect-error intentionally verifies strict MD013 option typing rejects misspelled keys
        'line-ength': 60,
    },
} satisfies MarkdownlintRuleConfiguration

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

function extractMd013Options(
    cfg: unknown,
): Record<string, unknown> | undefined {
    if (!isRecord(cfg)) {
        return undefined
    }

    const config = cfg.config
    const rules = cfg.rules
    const candidate = isRecord(config)
        ? config.MD013
        : isRecord(rules)
          ? rules.MD013
          : undefined

    return isRecord(candidate) ? candidate : undefined
}

describe('markdownlint MD013 option keys', () => {
    test('allows known keys for MD013', () => {
        const cfg = Markdownlint.config({
            cwd,
            rules: KNOWN_MD013_RULES,
        })
        const opts = extractMd013Options(cfg)
        expect(opts).toBeDefined()
        const keys = Object.keys(opts ?? {})
        expect(keys.every((key) => ALLOWED_MD013_KEYS.has(key))).toBe(true)
    })

    test('type fixture documents misspelled / unknown keys', () => {
        const keys = Object.keys(UNKNOWN_MD013_RULES.MD013)
        const unknown = keys.filter((key) => !ALLOWED_MD013_KEYS.has(key))

        expect(unknown).toEqual(['line-ength'])
    })
})
