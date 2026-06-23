import { describe, expect, test } from 'vitest'
import { EsLint } from './index.js'

const cwd = import.meta

describe('EsLint export', () => {
    test('has a config property', () => {
        expect(EsLint).toHaveProperty('config')
    })

    test('config returns an array when called with cwd', () => {
        expect(Array.isArray(EsLint.config({ cwd }))).toBe(true)
    })

    test('has a defineConfig function', () => {
        expect(typeof EsLint.defineConfig).toBe('function')
    })

    test('does not expose file helper options publicly', () => {
        expect(EsLint).not.toHaveProperty('files')
    })
})

describe('EsLint config merge behavior', () => {
    test('ignores option appends to the base ignores', () => {
        const baseIgnores = EsLint.config({ cwd })[0]?.ignores ?? []
        const config = EsLint.config({ cwd, ignores: ['custom/**'] })
        const ignoresEntry = config.find(
            (entry) => entry.name === 'Base: ignored paths',
        )
        expect(ignoresEntry?.ignores).toEqual([...baseIgnores, 'custom/**'])
    })

    test('overrides append config entries last', () => {
        const config = EsLint.config({
            cwd,
            overrides: [{ name: 'Custom override', rules: { semi: 'error' } }],
        })
        expect(config.at(-1)?.name).toBe('Custom override')
    })
})
