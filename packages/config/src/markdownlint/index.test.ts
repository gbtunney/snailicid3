import { describe, expect, test } from 'vitest'
import { Markdownlint } from './index.js'

const cwd = import.meta

describe('Markdownlint export', () => {
    test('has a config function', () => {
        expect(typeof Markdownlint.config).toBe('function')
        expect(typeof Markdownlint.config({ cwd })).toBe('object')
    })

    test('has rules.base and rules.merge helpers', () => {
        expect(typeof Markdownlint.rules.base).toBe('function')
        expect(typeof Markdownlint.rules.merge).toBe('function')
    })
})

describe('Markdownlint config merge behavior', () => {
    test('rules merge onto the base config by default', () => {
        const config = Markdownlint.config({ cwd, rules: { MD001: false } })
        expect(config.config.MD001).toBe(false)
        expect(config.config).toHaveProperty('MD014')
    })

    test('useBaseConfig false skips the base merge', () => {
        const config = Markdownlint.config({
            cwd,
            rules: { MD001: false },
            useBaseConfig: false,
        })
        expect(config.config).not.toHaveProperty('MD014')
    })

    test('ignores append to BASE_IGNORES', () => {
        const config = Markdownlint.config({ cwd, ignores: ['custom/**'] })
        expect(config.ignores).toContain('custom/**')
        expect(config.ignores).toContain('**/node_modules/**')
    })
})
