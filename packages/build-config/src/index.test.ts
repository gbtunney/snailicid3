import { describe, expect, test } from 'vitest'
import pkg from './../package.json' with { type: 'json' }
import { createBanner, defineBuildPlan, toTsdownConfigs } from './index.js'

describe('@snailicid3/build-config', () => {
    test('creates banner content from package metadata', () => {
        const banner = createBanner(
            {
                author: {
                    email: 'gbtunney@example.test',
                    name: 'Gillian Tunney',
                },
                description: 'Example package',
                license: 'MIT',
                name: '@snailicid3/example-package',
                repository: { type: 'git', url: 'https://example.test/repo' },
                version: '1.2.3',
            },
            'exampleLib',
        )

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

    test('defineBuildPlan produces tsdown configs', () => {
        const plan = defineBuildPlan(pkg, {
            entries: [{ key: '*', output_formats: ['esm', 'cjs', 'ts'] }],
            root: { outputDir: './dist', sourceDir: './src' },
        })

        const configs = toTsdownConfigs(plan)

        expect(configs).toHaveLength(1)
        expect(configs[0]?.format).toEqual(['esm', 'cjs'])
        expect(configs[0]?.dts).toBe(true)
        expect(configs[0]?.outDir).toBe('./dist')
    })

    test('banner accepts a sparse manifest carrying only name and version', () => {
        // Presence is left to the caller by packageIdentitySchema; the banner requires only the two fields
        // it cannot be written without, so a valid-but-sparse manifest must not be rejected.
        const banner = createBanner({
            name: 'sparse-package',
            version: '0.1.0',
        })

        expect(banner).toContain('sparse-package v0.1.0')
        expect(banner).not.toContain('undefined')
        expect(banner).not.toContain('License.')
    })

    test('banner accepts the shorthand author and repository string forms', () => {
        const banner = createBanner({
            author: 'Gillian Tunney',
            name: 'shorthand-package',
            repository: 'https://example.test/repo',
            version: '0.1.0',
        })

        expect(banner).toContain('Gillian Tunney')
        expect(banner).toContain('https://example.test/repo')
    })

    test('banner fails predictably when required identity is absent', () => {
        // The type now requires name and version, so these casts stand in for the untyped callers that
        // actually reach this guard: a manifest read from disk arrives as `unknown`.
        const sparse = (value: unknown): string | undefined =>
            createBanner(value as Parameters<typeof createBanner>[0])

        expect(sparse({ name: 'no-version' })).toBeUndefined()
        expect(sparse({ version: '1.0.0' })).toBeUndefined()
        expect(sparse({})).toBeUndefined()
        // Shape is still validated: an invalid npm name is rejected rather than rendered.
        expect(
            sparse({ name: 'Not A Valid Name', version: '1.0.0' }),
        ).toBeUndefined()
    })

    test('building never implies package validation', () => {
        const plan = defineBuildPlan(pkg, {
            entries: [
                { key: '*', lint: true, output_formats: ['esm', 'cjs', 'ts'] },
            ],
            root: { outputDir: './dist', sourceDir: './src' },
        })

        const [config] = toTsdownConfigs(plan)

        // Publint, ATTW and unused-dependency scanning are Doctor's job. `lint` may only drive tsdown's
        // own build report.
        expect(config).not.toHaveProperty('publint')
        expect(config).not.toHaveProperty('attw')
        expect(config).not.toHaveProperty('unused')
        expect(config.report).toBe(true)
    })

    test('lint:false turns off only the build report', () => {
        const plan = defineBuildPlan(pkg, {
            entries: [
                { key: '*', lint: false, output_formats: ['esm', 'cjs', 'ts'] },
            ],
            root: { outputDir: './dist', sourceDir: './src' },
        })

        expect(toTsdownConfigs(plan)[0]?.report).toBe(false)
    })

    test('config generation leaves the manifest alone', () => {
        const plan = defineBuildPlan(pkg, {
            entries: [{ key: '*', output_formats: ['esm', 'cjs', 'ts'] }],
            root: { outputDir: './dist', sourceDir: './src' },
        })

        // `exports: false` keeps tsdown from writing an exports map back into package.json.
        expect(toTsdownConfigs(plan)[0]?.exports).toBe(false)
    })

    test('multiple entries produce one native config each', () => {
        const plan = defineBuildPlan(pkg, {
            entries: [
                {
                    key: '*',
                    output_formats: ['esm', 'cjs', 'ts'],
                    runtime: 'node',
                },
                {
                    key: '*',
                    output_formats: ['iife'],
                    runtime: 'browser',
                },
            ],
            root: { outputDir: './dist', sourceDir: './src' },
        })

        const configs = toTsdownConfigs(plan)

        expect(configs).toHaveLength(2)
        expect(configs[0]?.platform).toBe('node')
        expect(configs[1]?.platform).toBe('browser')
        // Global formats need a globalName; module formats must not carry one.
        expect(configs[1]?.globalName).toBeTruthy()
        expect(configs[0]?.globalName).toBeUndefined()
    })
})

export {}
