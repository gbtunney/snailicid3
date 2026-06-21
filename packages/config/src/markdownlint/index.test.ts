import { describe, expect, test } from 'vitest'
import { Markdownlint } from './index.js'

describe('Markdownlint export', () => {
    test('has a config function', () => {
        expect(typeof Markdownlint.config).toBe('function')
        expect(typeof Markdownlint.config()).toBe('object')
    })

    test('has rules.base and rules.merge helpers', () => {
        expect(typeof Markdownlint.rules.base).toBe('function')
        expect(typeof Markdownlint.rules.merge).toBe('function')
    })
})

describe('Markdownlint config merge behavior', () => {
    test('rules merge onto the base config by default', () => {
        const config = Markdownlint.config({ rules: { MD001: false } })
        expect(config.config.MD001).toBe(false)
        expect(config.config).toHaveProperty('MD014')
    })

    test('useBaseConfig false skips the base merge', () => {
        const config = Markdownlint.config({
            rules: { MD001: false },
            useBaseConfig: false,
        })
        expect(config.config).not.toHaveProperty('MD014')
    })

    test('ignores append to BASE_IGNORES', () => {
        const config = Markdownlint.config({ ignores: ['custom/**'] })
        expect(config.ignores).toContain('custom/**')
        expect(config.ignores).toContain('**/node_modules/**')
    })
})
