import { describe, expect, test } from 'vitest'
import { LintStaged } from './index.js'

const cwd = import.meta

describe('LintStaged export', () => {
    test('has a config function', () => {
        expect(typeof LintStaged.config).toBe('function')
        expect(typeof LintStaged.config({ cwd })).toBe('object')
    })

    test('has helper functions', () => {
        expect(typeof LintStaged.defineConfig).toBe('function')
        expect(typeof LintStaged.toFileArgs).toBe('function')
    })
})
