import { describe, expect, test } from 'vitest'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { scaffoldInputSchema } from './input.js'
import { scaffoldPackage } from './scaffold.js'
import { generatePackageJson } from './templates/package-json.js'
import { generateReadme, HEADER_END, HEADER_START } from './templates/readme.js'
import { generateTsdownConfig } from './templates/rollup-config.js'
import { generateTsConfig } from './templates/tsconfig.js'

const testInput = scaffoldInputSchema.parse({
    description: 'A test package',
    name: 'my-pkg',
})

describe('scaffoldInputSchema', () => {
    test('accepts valid lowercase hyphenated name', () => {
        expect(() =>
            scaffoldInputSchema.parse({ name: 'my-pkg' }),
        ).not.toThrow()
    })

    test('rejects uppercase names', () => {
        expect(() => scaffoldInputSchema.parse({ name: 'MyPkg' })).toThrow()
    })

    test('rejects names starting with a number', () => {
        expect(() => scaffoldInputSchema.parse({ name: '1pkg' })).toThrow()
    })

    test('defaults description to empty string', () => {
        const result = scaffoldInputSchema.parse({ name: 'pkg' })
        expect(result.description).toBe('')
    })
})

describe('generatePackageJson', () => {
    test('sets scoped name', () => {
        const pkg = generatePackageJson(testInput)
        expect(pkg.name).toBe('@snailicid3/my-pkg')
    })

    test('includes expected script keys', () => {
        const pkg = generatePackageJson(testInput)
        const scripts = pkg.scripts as Record<string, string>
        expect(scripts).toHaveProperty('dev')
        expect(scripts).toHaveProperty('test:watch')
        expect(scripts).toHaveProperty('test:coverage')
    })

    test('includes standard devDependencies', () => {
        const pkg = generatePackageJson(testInput)
        const devDeps = pkg.devDependencies as Record<string, string>
        expect(devDeps).toHaveProperty('@snailicid3/config')
        expect(devDeps).toHaveProperty('typescript')
        expect(devDeps).toHaveProperty('vitest')
    })

    test('includes ESM exports', () => {
        const pkg = generatePackageJson(testInput)
        expect(pkg.type).toBe('module')
        const exports = pkg.exports as Record<string, unknown>
        expect(exports['.']).toBeDefined()
    })
})

describe('generateTsConfig', () => {
    test('extends config base', () => {
        const tsconfig = generateTsConfig(testInput)
        expect(tsconfig.extends).toBe('@snailicid3/config/tsconfig-base')
    })

    test('includes compilerOptions', () => {
        const tsconfig = generateTsConfig(testInput)
        const opts = tsconfig.compilerOptions as Record<string, unknown>
        expect(opts.outDir).toBe('./dist')
        expect(opts.rootDir).toBe('./src')
        expect(opts.declaration).toBe(true)
    })

    test('includes src glob in include', () => {
        const tsconfig = generateTsConfig(testInput)
        expect(tsconfig.include).toContain('./src/**/*.ts')
    })
})

describe('generateTsdownConfig', () => {
    test('imports build-config', () => {
        const config = generateTsdownConfig(testInput)
        expect(config).toContain("from '@snailicid3/build-config'")
    })

    test('uses defineBuildPlan', () => {
        const config = generateTsdownConfig(testInput)
        expect(config).toContain('defineBuildPlan')
    })

    test('is a non-empty string', () => {
        const config = generateTsdownConfig(testInput)
        expect(config.trim().length).toBeGreaterThan(0)
    })
})

describe('generateReadme', () => {
    test('contains header markers', () => {
        const readme = generateReadme(testInput)
        expect(readme).toContain(HEADER_START)
        expect(readme).toContain(HEADER_END)
    })

    test('contains scoped package name', () => {
        const readme = generateReadme(testInput)
        expect(readme).toContain('@snailicid3/my-pkg')
    })

    test('contains description', () => {
        const readme = generateReadme(testInput)
        expect(readme).toContain('A test package')
    })
})

describe('scaffoldPackage', () => {
    test('creates all expected files in a temp directory', () => {
        const outDir = mkdtempSync(join(tmpdir(), 'scaffold-test-'))
        scaffoldPackage(testInput, outDir)

        const files = [
            'package.json',
            'tsconfig.json',
            'tsdown.config.ts',
            'README.md',
            'src/index.ts',
        ]
        for (const file of files) {
            const content = readFileSync(join(outDir, file), 'utf8')
            expect(content.length).toBeGreaterThan(0)
        }
    })

    test('package.json has correct name', () => {
        const outDir = mkdtempSync(join(tmpdir(), 'scaffold-test-'))
        scaffoldPackage(testInput, outDir)

        const pkg = JSON.parse(
            readFileSync(join(outDir, 'package.json'), 'utf8'),
        )
        expect(pkg.name).toBe('@snailicid3/my-pkg')
    })

    test('src/index.ts contains package comment', () => {
        const outDir = mkdtempSync(join(tmpdir(), 'scaffold-test-'))
        scaffoldPackage(testInput, outDir)

        const content = readFileSync(join(outDir, 'src/index.ts'), 'utf8')
        expect(content).toContain('@snailicid3/my-pkg')
    })
})
describe('index.ts exports', () => {
    test('exports Commitlint configuration', () => {
        const { Commitlint } = await import('@snailicid3/config')
        expect(Commitlint).toBeDefined()
    })

    test('exports workspaceScopes and workspaceScopesCsv', () => {
        const { workspaceScopes, workspaceScopesCsv } =
            await import('@snailicid3/config')
        expect(workspaceScopes).toBeDefined()
        expect(workspaceScopesCsv).toBeDefined()
    })

    test('exports defineConfig', () => {
        const { defineConfig } = await import('@snailicid3/config')
        expect(defineConfig).toBeDefined()
    })

    test('exports EsLint configuration', () => {
        const { EsLint } = await import('@snailicid3/config')
        expect(EsLint).toBeDefined()
    })

    test('exports LintStaged configuration', () => {
        const { LintStaged } = await import('@snailicid3/config')
        expect(LintStaged).toBeDefined()
    })

    test('exports Markdownlint configuration', () => {
        const { Markdownlint } = await import('@snailicid3/config')
        expect(Markdownlint).toBeDefined()
    })

    test('exports Prettier configuration', () => {
        const { Prettier } = await import('@snailicid3/config')
        expect(Prettier).toBeDefined()
    })

    test('exports shared file extensions', () => {
        const {
            JS_FILE_EXTENSIONS,
            JSLIKE_FILE_EXTENSIONS,
            MARKDOWN_FILE_EXTENSIONS,
            PRETTIER_FILE_EXTENSIONS,
            TS_FILE_EXTENSIONS,
        } = await import('@snailicid3/config')
        expect(JS_FILE_EXTENSIONS).toBeDefined()
        expect(JSLIKE_FILE_EXTENSIONS).toBeDefined()
        expect(TS_FILE_EXTENSIONS).toBeDefined()
        expect(PRETTIER_FILE_EXTENSIONS).toBeDefined()
        expect(MARKDOWN_FILE_EXTENSIONS).toBeDefined()
    })

    test('exports utilities', () => {
        const {
            expandExtensions,
            exportJSONFile,
            getFilePath,
            importJSON,
            isPlainObject,
            merge,
            prettyPrintJSON,
            safeDeserializeJSON,
            serializeJSON,
        } = await import('@snailicid3/config')
        expect(expandExtensions).toBeDefined()
        expect(exportJSONFile).toBeDefined()
        expect(importJSON).toBeDefined()
        expect(isPlainObject).toBeDefined()
        expect(prettyPrintJSON).toBeDefined()
        expect(safeDeserializeJSON).toBeDefined()
        expect(serializeJSON).toBeDefined()
        expect(getFilePath).toBeDefined()
        expect(merge).toBeDefined()
    })
})
