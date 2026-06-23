import { describe, expect, test } from 'vitest'
import * as ConfigPackage from './index.js'
import {
    ApiExtractor,
    Commitlint,
    type ConfigToolRegistry,
    EsLint,
    LintStaged,
    Markdownlint,
    type MarkdownlintTool,
    Prettier,
    typedoc,
    Typedoc,
    type TypedocTool,
} from './index.js'

const cwd = import.meta

describe('@snailicid3/config public API', () => {
    test('exports the lowercase typedoc backward-compatible alias', () => {
        expect(typedoc).toBe(Typedoc)
    })

    test('exports capitalized tool namespaces', () => {
        expect(typeof ApiExtractor.config).toBe('function')
        expect(typeof Commitlint.config).toBe('function')
        expect(typeof EsLint.config).toBe('function')
        expect(typeof LintStaged.config).toBe('function')
        expect(typeof Markdownlint.config).toBe('function')
        expect(typeof Prettier.config).toBe('function')
        expect(typeof Typedoc.config).toBe('function')
    })

    test('tool namespaces expose defineConfig helpers', () => {
        expect(typeof ApiExtractor.defineConfig).toBe('function')
        expect(typeof Commitlint.defineConfig).toBe('function')
        expect(typeof Markdownlint.defineConfig).toBe('function')
        expect(typeof Prettier.defineConfig).toBe('function')
        expect(typeof Typedoc.defineConfig).toBe('function')
    })

    test('tool extras remain available on namespaces', () => {
        expect(typeof Commitlint.workspaceScopes).toBe('function')
        expect(typeof Commitlint.workspaceScopesCsv).toBe('function')
        expect(Array.isArray(Commitlint.commitTypes)).toBe(true)
        expect(typeof Prettier.configFile).toBe('function')
        expect(typeof Prettier.options.base).toBe('function')
        expect(typeof Prettier.overrides.base).toBe('function')
        expect(typeof Prettier.plugins.default).toBe('function')
        expect(typeof Prettier.plugins.packageNames).toBe('function')
        expect(typeof Typedoc.markdown.config).toBe('function')
    })

    test('does not export old buildFunction helpers at package root', () => {
        expect('buildApiExtractorConfigFunction' in ConfigPackage).toBe(false)
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
            cwd,
            rules: { MD001: false },
        }
        const config: ConfigToolRegistry['markdownlint']['config'] =
            Markdownlint.config(options)

        expect(config.config.MD001).toBe(false)
    })

    test('tool type aliases expose config, options, and api slots', () => {
        const options: MarkdownlintTool['options'] = {
            cwd,
            rules: { MD003: false },
        }
        const api: MarkdownlintTool['api'] = Markdownlint
        const config: MarkdownlintTool['config'] = api.config(options)

        expect(config.config.MD003).toBe(false)
    })

    test('typedoc namespace follows the tool API shape', () => {
        const options: ConfigToolRegistry['typedoc']['functionOptions'] = {
            cwd,
            overrides: { excludeExternals: true },
        }
        const api: TypedocTool['api'] = Typedoc
        const config = api.config(options)

        expect(typedoc).toBe(Typedoc)
        expect(config?.excludeExternals).toBe(true)
        expect(typeof Typedoc.markdown.config).toBe('function')
    })
})
