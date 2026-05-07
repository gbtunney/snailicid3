import { describe, expect, test } from 'vitest'
import pkg from './../../package.json' with { type: 'json' }
import {
    defineBuildPlan,
    deriveBuildPlanEntry,
    entryKeyToSlug,
    isRootEntryKey,
    packageNameToDisplayName,
    packageNameToModuleName,
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
        const plan = defineBuildPlan(pkg)

        expect(plan.packageName).toBe('@snailicid3/build-config')
        expect(plan.entries).toHaveLength(1)
        expect(plan.entries[0]?.exportKey).toBe('.')
    })

    test('defineBuildPlan merges root into every entry', () => {
        const plan = defineBuildPlan(pkg, {
            root: {
                outputDir: './lib',
                sourceDir: './src',
            },
            entries: [
                { key: '*', sourceFile: 'index.ts' },
                { key: './vitest', sourceFile: 'vitest/index.ts' },
            ],
        })

        expect(plan.outputDir).toBe('./lib')
        expect(plan.entries).toHaveLength(2)
        expect(plan.entries[0]?.outputDir).toBe('./lib')
        expect(plan.entries[1]?.outputDir).toBe('./lib')
    })

    test('entry overrides root config', () => {
        const plan = defineBuildPlan(pkg, {
            root: {
                bundle: true,
                outputDir: './dist',
            },
            entries: [
                {
                    bundle: false,
                    key: '*',
                    sourceFile: 'index.ts',
                },
            ],
        })

        expect(plan.entries[0]?.bundle).toBe(false)
    })

    test('can omit banner content', () => {
        const plan = defineBuildPlan(pkg, {
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
})
