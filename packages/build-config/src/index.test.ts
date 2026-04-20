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
    toRollupConfig,
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

        expect(identityFromPackage({})).toBeUndefined()
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

    test('creates package exports map from plan', () => {
        const plan = definePlan(
            defineIdentity('node', 'library', 'bundle'),
            './src',
            './dist',
            [defineEntry('.', ['esm', 'cjs'])],
        )

        expect(toPackageExports(plan)).toEqual({
            '.': {
                import: './dist/index.js',
                require: './dist/index.cjs',
            },
        })
    })

    test('creates rollup config with esm and cjs outputs', () => {
        const plan = definePlan(
            defineIdentity('node', 'library', 'bundle'),
            './src',
            './dist',
            [defineEntry('.', ['esm', 'cjs'])],
        )
        const config = toRollupConfig(plan, 'exampleLib')

        expect(config).toHaveLength(1)
        const firstConfig = config[0]
        expect(firstConfig.input).toContain('/src/index.ts')

        const outputs = Array.isArray(firstConfig.output)
            ? firstConfig.output
            : [firstConfig.output]
        const files = outputs
            .map((output) => output?.file)
            .filter((file): file is string => Boolean(file))

        expect(files).toEqual(
            expect.arrayContaining([
                expect.stringContaining('/dist/index.js'),
                expect.stringContaining('/dist/index.cjs'),
            ]),
        )
    })

    test('creates banner content from package metadata', () => {
        const banner = createBanner('exampleLib', {
            author: { name: 'Gillian Tunney' },
            description: 'Example package',
            license: 'MIT',
            name: '@snailicid3/example-package',
            repository: { url: 'https://example.test/repo' },
            version: '1.2.3',
        })

        expect(banner).toContain('@snailicid3/example-package v1.2.3')
        expect(banner).toContain('Module: exampleLib')
        expect(banner).toContain('Released under the MIT License.')
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

        expect(selectAdapter(bundlePlan)?.name).toBe('rollup')
        expect(selectAdapter(transpilePlan)?.name).toBe('tsc')
        expect(selectAdapter(nonePlan)?.name).toBe('none')
    })
})

export {}
