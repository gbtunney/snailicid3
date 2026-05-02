import { describe, expect, test } from 'vitest'
import {
    createBanner,
    defineEntry,
    defineIdentity,
    definePlan,
    identityFromPackage,
    normaliseExportKey,
    resolveEntryFilename,
    selectAdapter,
    toPackageExports,
    toTsdownConfig,
} from './index.js'

describe('@snailicid3/build-config', () => {
    test('creates identity from package buildConfig', () => {
        expect(
            identityFromPackage({
                buildConfig: {
                    buildStrategy: 'bundle',
                    product: 'library',
                    runtime: 'node',
                },
            }),
        ).toEqual({
            buildStrategy: 'bundle',
            product: 'library',
            runtime: 'node',
        })

        expect(identityFromPackage({})).toEqual({
            buildStrategy: 'none',
            product: 'library',
            runtime: 'universal',
        })
    })

    test('normalises entry keys and filename stems', () => {
        expect(normaliseExportKey('.')).toBe('.')
        expect(normaliseExportKey('utils')).toBe('./utils')
        expect(normaliseExportKey('./utils')).toBe('./utils')

        expect(resolveEntryFilename('.')).toBe('index')
        expect(resolveEntryFilename('./utils')).toBe('utils')
        expect(resolveEntryFilename('main')).toBe('index')
    })

    test('applies defineEntry defaults', () => {
        expect(defineEntry('.', ['esm', 'cjs'])).toEqual({
            key: '.',
            outputKinds: ['esm', 'cjs'],
            sourcemap: true,
        })
    })

    test('creates package exports map — esm+cjs', () => {
        const plan = definePlan(
            defineIdentity('node', 'library', 'bundle'),
            './src',
            './dist',
            [defineEntry('.', ['esm', 'cjs'])],
        )

        expect(toPackageExports(plan)).toEqual({
            '.': {
                default: './dist/index.js',
                import: './dist/index.js',
                require: './dist/index.cjs',
            },
        })
    })

    test('creates package exports map — esm+cjs+iife+umd with dts', () => {
        const plan = definePlan(
            defineIdentity('node', 'library', 'bundle'),
            './src',
            './dist',
            [defineEntry('.', ['esm', 'cjs', 'iife', 'umd'], { dts: true })],
        )

        expect(toPackageExports(plan)).toEqual({
            '.': {
                browser: './dist/index-iife.js',
                default: './dist/index.js',
                import: './dist/index.js',
                require: './dist/index.cjs',
                types: './dist/index.d.ts',
            },
        })
    })

    test('creates package exports map — umd only (no iife)', () => {
        const plan = definePlan(
            defineIdentity('browser', 'library', 'bundle'),
            './src',
            './dist',
            [defineEntry('.', ['umd'])],
        )

        expect(toPackageExports(plan)).toEqual({
            '.': {
                browser: './dist/index-umd.js',
                default: './dist/index-umd.js',
            },
        })
    })

    test('creates tsdown config from plan', () => {
        const plan = definePlan(
            defineIdentity('node', 'library', 'bundle'),
            './src',
            './dist',
            [defineEntry('.', ['esm', 'cjs'])],
        )
        const config = toTsdownConfig(plan)

        expect(config.format).toEqual(['esm', 'cjs'])
        expect(config.outDir).toBe('./dist')
        expect(config.platform).toBe('node')
        expect(config.entry).toMatchObject({
            index: expect.stringContaining('/src/index.ts'),
        })
    })

    test('creates banner content from package metadata', () => {
        const banner = createBanner('exampleLib', {
            author: { email: 'gbtunney@example.test', name: 'Gillian Tunney' },
            description: 'Example package',
            license: 'MIT',
            name: '@snailicid3/example-package',
            repository: { type: 'git', url: 'https://example.test/repo' },
            version: '1.2.3',
        })

        expect(banner).toContain('@snailicid3/example-package v1.2.3')
        expect(banner).toContain('Module: exampleLib')
        expect(banner).toContain('Released under the MIT License.')
    })

    test('creates banner with derived module name from package name', () => {
        const banner = createBanner({
            author: { email: 'gbtunney@example.test', name: 'Gillian Tunney' },
            description: 'Example package',
            license: 'MIT',
            name: '@snailicid3/example-package',
            repository: { type: 'git', url: 'https://example.test/repo' },
            version: '1.2.3',
        })

        expect(banner).toContain('Module: Example Package')
    })

    test('selects adapter from build strategy and product', () => {
        const bundlePlan = definePlan(
            defineIdentity('node', 'library', 'bundle'),
            './src',
            './dist',
            [defineEntry('.', ['esm'])],
        )
        const transpilePlan = definePlan(
            defineIdentity('node', 'library', 'transpile'),
            './src',
            './dist',
            [defineEntry('.', ['esm'])],
        )
        const nonePlan = definePlan(
            defineIdentity('node', 'config', 'none'),
            './src',
            './dist',
            [defineEntry('.', ['esm'])],
        )
        const scriptPlan = definePlan(
            defineIdentity('browser', 'script', 'bundle'),
            './src',
            './dist',
            [defineEntry('.', ['iife'])],
        )
        const webAppPlan = definePlan(
            defineIdentity('browser', 'web_app', 'bundle'),
            './src',
            './dist',
            [defineEntry('.', ['esm'])],
        )

        expect(selectAdapter(bundlePlan)?.name).toBe('tsdown')
        expect(selectAdapter(transpilePlan)?.name).toBe('tsc')
        expect(selectAdapter(nonePlan)?.name).toBe('none')
        expect(selectAdapter(scriptPlan)?.name).toBe('esbuild')
        expect(selectAdapter(webAppPlan)?.name).toBe('vite')
    })
})

export {}
