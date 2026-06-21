import { describe, expect, test } from 'vitest'
import { Prettier } from './index.js'
describe('Prettier export', () => {
    test('has a config function', () => {
        expect(typeof Prettier.config).toBe('function')
    })

    test('has options/overrides/plugins namespaces', () => {
        expect(typeof Prettier.options.base).toBe('function')
        expect(typeof Prettier.overrides.base).toBe('function')
        expect(typeof Prettier.plugins.default).toBe('function')
        expect(typeof Prettier.plugins.packageNames).toBe('function')
    })
})

describe('Prettier config merge behavior', () => {
    test('options shallow-merge over the defaults', () => {
        const config = Prettier.config({ options: { tabWidth: 2 } })
        expect(config.tabWidth).toBe(2)
        expect(config.singleQuote).toBe(Prettier.options.base().singleQuote)
    })

    test('overrides append after the default overrides', () => {
        const baseOverridesLength = Prettier.overrides.base().length
        const config = Prettier.config({
            overrides: [{ files: '*.foo', options: { parser: 'babel' } }],
        })
        expect(config.overrides).toHaveLength(baseOverridesLength + 1)
        expect(config.overrides.at(-1)?.files).toBe('*.foo')
    })
})
