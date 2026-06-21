import { describe, expect, test } from 'vitest'
import { LintStaged } from './index.js'

describe('LintStaged export', () => {
    test('has a config function', () => {
        expect(typeof LintStaged.config).toBe('function')
        expect(typeof LintStaged.config()).toBe('object')
    })

    test('has helper functions', () => {
        expect(typeof LintStaged.defineConfig).toBe('function')
        expect(typeof LintStaged.toFileArgs).toBe('function')
    })
})
