import { describe, expect, test } from 'vitest'
import pkg from './../../package.json' with { type: 'json' }
import {
    defineBuildPlan,
    deriveBuildPlanEntry,
    entryKeyToSlug,
    isRootEntryKey,
    packageNameToDisplayName,
    packageNameToModuleName,
    toPackageExportsPlan2,
} from './plan2.js'
import { schemaBasePackage } from './schemas/index.js'

const parsedPkg = schemaBasePackage.parse(pkg)

describe('plan2', () => {
    test('detects root entry keys', () => {
        expect(isRootEntryKey('*')).toBe(true)
        expect(isRootEntryKey('.')).toBe(true)
        expect(isRootEntryKey('./')).toBe(true)
        expect(isRootEntryKey('index')).toBe(true)
        expect(isRootEntryKey('./browser')).toBe(false)
    })

    test('converts entry keys to slugs', () => {
        expect(entryKeyToSlug('*')).toBe('index')
        expect(entryKeyToSlug('.')).toBe('index')
        expect(entryKeyToSlug('./browser')).toBe('browser')
        expect(entryKeyToSlug('node-utils')).toBe('node-utils')
    })

    test('derives display and module names from package name', () => {
        expect(packageNameToDisplayName('@snailicid3/build-config')).toBe(
            'Build Config',
        )
        expect(packageNameToModuleName('@snailicid3/build-config')).toBe(
            'BuildConfig',
        )
    })

    test('derives a root entry', () => {
        const entry = deriveBuildPlanEntry({
            entry: { key: '*' },
            pkg: parsedPkg,
            root: {
                bundle: true,
                outputDir: './dist',
                product: 'library',
                runtime: 'universal',
                sourceDir: './src',
                transpile: true,
            },
        })

        expect(entry.key).toBe('*')
        expect(entry.exportKey).toBe('.')
        expect(entry.fileName).toBe('index')
        expect(entry.displayName).toBe('Build Config')
        expect(entry.moduleName).toBe('BuildConfig')
        expect(entry.output_formats).toEqual(['esm', 'cjs', 'ts'])
        expect(entry.bannerContent).toContain('@snailicid3/build-config')
    })

    test('derives a non-root entry', () => {
        const entry = deriveBuildPlanEntry({
            entry: { key: './vitest', sourceFile: 'vitest/index.ts' },
            pkg: parsedPkg,
            root: {
                bundle: true,
                outputDir: './dist',
                product: 'library',
                runtime: 'universal',
                sourceDir: './src',
                transpile: true,
            },
        })

        expect(entry.exportKey).toBe('./vitest')
        expect(entry.fileName).toBe('vitest')
        expect(entry.displayName).toBe('Vitest')
        expect(entry.moduleName).toBe('Vitest')
        expect(entry.sourcePath).toContain('src/vitest/index.ts')
    })

    test('defineBuildPlan defaults to a root entry', () => {
        const plan = defineBuildPlan(parsedPkg)

        expect(plan.packageName).toBe('@snailicid3/build-config')
        expect(plan.entries).toHaveLength(1)
        expect(plan.entries[0]?.exportKey).toBe('.')
    })

    test('defineBuildPlan merges root into every entry', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [
                { key: '*', sourceFile: 'index.ts' },
                { key: './vitest', sourceFile: 'vitest/index.ts' },
            ],
            root: {
                outputDir: './lib',
                sourceDir: './src',
            },
        })

        expect(plan.outputDir).toBe('./lib')
        expect(plan.entries).toHaveLength(2)
        expect(plan.entries[0]?.outputDir).toBe('./lib')
        expect(plan.entries[1]?.outputDir).toBe('./lib')
    })

    test('entry overrides root config', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [
                {
                    bundle: false,
                    key: '*',
                    sourceFile: 'index.ts',
                },
            ],
            root: {
                bundle: true,
                outputDir: './dist',
            },
        })

        expect(plan.entries[0]?.bundle).toBe(false)
    })

    test('can omit banner content', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [
                {
                    banner: false,
                    key: '*',
                    sourceFile: 'index.ts',
                },
            ],
        })

        expect(plan.entries[0]?.bannerContent).toBeUndefined()
    })

    test('toPackageExportsPlan2 includes types for root and named exports', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [
                { key: '*', output_formats: ['esm', 'cjs', 'ts'] },
                {
                    key: './node',
                    output_formats: ['esm', 'cjs', 'ts'],
                    sourceFile: 'index.ts',
                },
            ],
            root: {
                outputDir: './dist',
            },
        })

        expect(toPackageExportsPlan2(plan)).toEqual({
            '.': {
                default: './dist/index.js',
                import: './dist/index.js',
                require: './dist/index.cjs',
                types: './dist/index.d.ts',
            },
            './node': {
                default: './dist/node.js',
                import: './dist/node.js',
                require: './dist/node.cjs',
                types: './dist/node.d.ts',
            },
        })
    })

    test('toPackageExportsPlan2 supports strict extension preset', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [{ key: '*', output_formats: ['esm', 'cjs', 'ts'] }],
        })

        expect(
            toPackageExportsPlan2(plan, { extensionPreset: 'strict' }),
        ).toEqual({
            '.': {
                default: './dist/index.mjs',
                import: './dist/index.mjs',
                require: './dist/index.cjs',
                types: './dist/index.d.mts',
            },
        })
    })

    test('toPackageExportsPlan2 skips entries with exports:false', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [
                {
                    exports: false,
                    key: './internal',
                    output_formats: ['esm', 'ts'],
                    sourceFile: 'index.ts',
                },
                { key: '*', output_formats: ['esm', 'ts'] },
            ],
        })

        expect(toPackageExportsPlan2(plan)).toEqual({
            '.': {
                default: './dist/index.js',
                import: './dist/index.js',
                types: './dist/index.d.ts',
            },
        })
    })
})
