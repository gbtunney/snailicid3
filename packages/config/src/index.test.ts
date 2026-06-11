import { describe, expect, test } from 'vitest'
import {
    Commitlint,
    defineConfig,
    EsLint,
    expandExtensions,
    JS_FILE_EXTENSIONS,
    JSLIKE_FILE_EXTENSIONS,
    Markdownlint,
    Prettier,
    PRETTIER_FILE_EXTENSIONS,
    TS_FILE_EXTENSIONS,
} from './index.js'

describe('file extension constants', () => {
    test('JS_FILE_EXTENSIONS contains js', () => {
        expect(JS_FILE_EXTENSIONS).toContain('js')
    })

    test('TS_FILE_EXTENSIONS contains ts', () => {
        expect(TS_FILE_EXTENSIONS).toContain('ts')
    })

    test('JSLIKE_FILE_EXTENSIONS includes both js and ts entries', () => {
        expect(JSLIKE_FILE_EXTENSIONS).toContain('js')
        expect(JSLIKE_FILE_EXTENSIONS).toContain('ts')
    })

    test('PRETTIER_FILE_EXTENSIONS is a non-empty array', () => {
        expect(Array.isArray(PRETTIER_FILE_EXTENSIONS)).toBe(true)
        expect(PRETTIER_FILE_EXTENSIONS.length).toBeGreaterThan(0)
    })
})

describe('expandExtensions', () => {
    test('returns an array of the same length', () => {
        expect(expandExtensions(['ts', 'js'])).toHaveLength(2)
    })

    test('passes extensions through without a base pattern', () => {
        expect(expandExtensions(['ts'])).toEqual(['ts'])
    })

    test('prepends base pattern with trailing dot', () => {
        expect(expandExtensions(['ts'], 'src')).toEqual(['src.ts'])
    })
})

describe('core defineConfig', () => {
    test('returns the config unchanged', () => {
        expect(defineConfig({ a: 1 })).toEqual({ a: 1 })
    })
})

describe('Commitlint export', () => {
    test('is a non-null object', () => {
        expect(Commitlint).toBeDefined()
        expect(typeof Commitlint).toBe('object')
    })

    test('has a config function', () => {
        expect(typeof Commitlint.config).toBe('function')
    })

    test('has workspace scope helpers', () => {
        expect(typeof Commitlint.workspaceScopes).toBe('function')
        expect(typeof Commitlint.workspaceScopesCsv).toBe('function')
    })

    test('config returns an object with extends', () => {
        const config = Commitlint.config()
        expect(config).toHaveProperty('extends')
    })
})

describe('Commitlint config merge behavior', () => {
    test('appendTypes appends to commitTypes for the type-enum rule', () => {
        const config = Commitlint.config({ appendTypes: ['custom-type'] })
        const typeEnumRule = config.rules?.['type-enum'] as
            | [number, string, Array<string>]
            | undefined
        expect(typeEnumRule?.[2]).toContain('custom-type')
        expect(typeEnumRule?.[2]).toEqual(
            expect.arrayContaining([...Commitlint.commitTypes]),
        )
    })

    test('scopeOptions.mergeScopes appends to the scope-enum rule', () => {
        const config = Commitlint.config({
            scopeOptions: { mergeScopes: ['extra-scope'] },
        })
        const scopeEnumRule = config.rules?.['scope-enum'] as
            | [number, string, Array<string>]
            | undefined
        expect(scopeEnumRule?.[2]).toContain('extra-scope')
    })
})

describe('EsLint export', () => {
    test('has a config property', () => {
        expect(EsLint).toHaveProperty('config')
    })

    test('config returns an array when called with no arguments', () => {
        expect(Array.isArray(EsLint.config())).toBe(true)
    })

    test('has a defineConfig function', () => {
        expect(typeof EsLint.defineConfig).toBe('function')
    })

    test('has files.base and files.resolve helpers', () => {
        expect(typeof EsLint.files.base).toBe('function')
        expect(typeof EsLint.files.resolve).toBe('function')
    })
})

describe('EsLint config merge behavior', () => {
    test('ignores option appends to the base ignores', () => {
        const baseIgnores = EsLint.config()[0]?.ignores ?? []
        const config = EsLint.config({ ignores: ['custom/**'] })
        const ignoresEntry = config.find(
            (entry) => entry.name === 'Base: ignored paths',
        )
        expect(ignoresEntry?.ignores).toEqual([...baseIgnores, 'custom/**'])
    })

    test('additionalFiles appends to the base files', () => {
        const config = EsLint.config({ additionalFiles: ['*.foo'] })
        const filesEntry = config.find(
            (entry) => entry.name === 'Base: included file extensions',
        )
        expect(filesEntry?.files).toEqual(
            expect.arrayContaining([...EsLint.files.base(), '*.foo']),
        )
    })

    test('files option replaces the base files', () => {
        const config = EsLint.config({ files: ['*.custom'] })
        const filesEntry = config.find(
            (entry) => entry.name === 'Base: included file extensions',
        )
        expect(filesEntry?.files).toEqual(['*.custom'])
    })
})

describe('Prettier export', () => {
    test('has a config function', () => {
        expect(typeof Prettier.config).toBe('function')
    })

    test('has options/overrides/plugins namespaces', () => {
        expect(typeof Prettier.options.base).toBe('function')
        expect(typeof Prettier.overrides.base).toBe('function')
        expect(typeof Prettier.plugins.bundled).toBe('function')
        expect(typeof Prettier.plugins.list).toBe('function')
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

export {}
