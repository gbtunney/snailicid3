import { describe, expect, test } from 'vitest'
import * as ConfigPackage from './index.js'
import {
    Commitlint,
    defineConfig,
    EsLint,
    expandExtensions,
    JS_FILE_EXTENSIONS,
    JSLIKE_FILE_EXTENSIONS,
    LintStaged,
    Markdownlint,
    Prettier,
    PRETTIER_FILE_EXTENSIONS,
    TS_FILE_EXTENSIONS,
    Typedoc,
    typedoc,
} from './index.js'
import type {
    ConfigToolRegistry,
    MarkdownlintTool,
    TypedocTool,
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

describe('tool namespace API', () => {
    test.each([
        ['Commitlint', Commitlint],
        ['EsLint', EsLint],
        ['LintStaged', LintStaged],
        ['Markdownlint', Markdownlint],
        ['Prettier', Prettier],
        ['Typedoc', Typedoc],
    ])('%s exposes config and defineConfig', (_name, tool) => {
        expect(typeof tool.config).toBe('function')
        expect(typeof tool.defineConfig).toBe('function')
    })

    test('does not expose raw config builder helpers from the root API', () => {
        expect('buildCommitlintConfigFunction' in ConfigPackage).toBe(false)
        expect('buildEsLintConfigFunction' in ConfigPackage).toBe(false)
        expect('buildLintStagedConfigFunction' in ConfigPackage).toBe(false)
        expect('buildMarkdownlintConfigFunction' in ConfigPackage).toBe(false)
        expect('buildPrettierConfigFunction' in ConfigPackage).toBe(false)
        expect('buildFunctionCommitlint' in ConfigPackage).toBe(false)
        expect('buildFunctionEsLint' in ConfigPackage).toBe(false)
        expect('buildFunctionLintStaged' in ConfigPackage).toBe(false)
        expect('buildFunctionMarkdownlint' in ConfigPackage).toBe(false)
        expect('buildFunctionPrettier' in ConfigPackage).toBe(false)
        expect('buildFunctionTypedoc' in ConfigPackage).toBe(false)
    })

    test('registry type map exposes native config and function options', () => {
        const options: ConfigToolRegistry['markdownlint']['functionOptions'] = {
            rules: { MD001: false },
        }
        const config: ConfigToolRegistry['markdownlint']['config'] =
            Markdownlint.config(options)

        expect(config.config.MD001).toBe(false)
    })

    test('tool type aliases expose config, options, and api slots', () => {
        const options: MarkdownlintTool['options'] = {
            rules: { MD002: false },
        }
        const api: MarkdownlintTool['api'] = Markdownlint
        const config: MarkdownlintTool['config'] = api.config(options)

        expect(config.config.MD002).toBe(false)
    })

    test('typedoc namespace follows the tool API shape', () => {
        const options: ConfigToolRegistry['typedoc']['functionOptions'] = {
            overrides: { excludeExternals: true },
        }
        const api: TypedocTool['api'] = Typedoc
        const config = api.config(options)

        expect(typedoc).toBe(Typedoc)
        expect(config?.excludeExternals).toBe(true)
        expect(typeof Typedoc.markdown.config).toBe('function')
        expect(typeof Typedoc.materialTheme.config).toBe('function')
        expect(typeof Typedoc.vitepress.config).toBe('function')
        expect(Typedoc.plugins.default()).toEqual(['typedoc-plugin-zod'])
        expect(Typedoc.plugins.markdown()).toEqual([
            'typedoc-plugin-markdown',
            'typedoc-plugin-zod',
        ])
    })
})

export {}
