import { describe, expect, test } from 'vitest'
import pkg from './../../../package.json' with { type: 'json' }
import {
    entryToViteConfig,
    toViteConfig,
    toViteConfigs,
    viteAdapter,
} from './to-vite.js'
import { defineBuildPlan } from '../../build/plan.js'
import { schemaBasePackage } from '../../build/schemas/package.js'

const parsedPkg = schemaBasePackage.parse(pkg)

describe('vite adapter', () => {
    test('maps browser library entries to Vite lib config', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [
                {
                    key: '*',
                    output_formats: ['esm', 'cjs', 'iife', 'umd', 'ts'],
                    runtime: 'browser',
                },
            ],
        })
        const entry = plan.entries[0]
        const config = entryToViteConfig(entry, plan)
        const lib = config.build?.lib

        if (!lib) {
            throw new Error('Expected Vite library config.')
        }

        expect(lib.entry).toBe(entry.sourcePath)
        expect(lib.formats).toEqual(['es', 'cjs', 'iife', 'umd'])
        expect(lib.name).toBe('BuildConfig')
        expect(typeof lib.fileName).toBe('function')

        if (typeof lib.fileName !== 'function') {
            throw new TypeError('Expected Vite library fileName function.')
        }

        expect(lib.fileName('es', 'index')).toBe('index.js')
        expect(lib.fileName('cjs', 'index')).toBe('index.cjs')
        expect(lib.fileName('iife', 'index')).toBe('index-iife.js')
        expect(lib.fileName('umd', 'index')).toBe('index-umd.js')
        expect(config.build?.outDir).toBe('./dist')
        expect(config.build?.emptyOutDir).toBe(false)
        expect(config.logLevel).toBe(entry.logLevel)
    })

    test('maps web app plans to Vite app config', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [
                {
                    key: '*',
                    runtime: 'browser',
                    sourceFile: 'index.ts',
                },
            ],
            root: {
                product: 'web_app',
                runtime: 'browser',
            },
        })
        const config = toViteConfig(plan)

        expect(config.build?.lib).toBeUndefined()
        expect(config.build?.emptyOutDir).toBe(true)
        expect(config.build?.outDir).toBe('./dist')
        expect(config.build?.sourcemap).toBe(true)
    })

    test('maps a single selected entry by normalized key', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [
                {
                    key: '*',
                    runtime: 'browser',
                    sourceFile: 'index.ts',
                },
                {
                    key: './vitest',
                    runtime: 'browser',
                    sourceFile: 'vitest/index.ts',
                },
            ],
        })
        const config = toViteConfig(plan, 'vitest')

        const lib = config.build?.lib

        if (!lib) {
            throw new Error('Expected Vite library config.')
        }

        expect(typeof lib.fileName).toBe('function')
        expect(lib.name).toBe('Vitest')
    })

    test('maps browser and universal entries to configs', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [
                {
                    key: './browser',
                    runtime: 'browser',
                    sourceFile: 'index.ts',
                },
                {
                    key: './universal',
                    runtime: 'universal',
                    sourceFile: 'index.ts',
                },
                {
                    key: './node',
                    runtime: 'node',
                    sourceFile: 'index.ts',
                },
            ],
        })
        const configs = toViteConfigs(plan)

        expect(configs).toHaveLength(2)
    })

    test('maps web app plans to one config', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [
                {
                    key: '*',
                    runtime: 'browser',
                    sourceFile: 'index.ts',
                },
            ],
            root: {
                product: 'web_app',
                runtime: 'browser',
            },
        })

        expect(toViteConfigs(plan)).toHaveLength(1)
    })

    test('adds the dts plugin when an entry requests ts output', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [
                {
                    key: '*',
                    output_formats: ['esm', 'ts'],
                    runtime: 'browser',
                },
            ],
        })
        const config = toViteConfig(plan)

        expect(config.plugins).toHaveLength(1)
    })

    test('omits the dts plugin when an entry does not request ts output', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [
                {
                    key: '*',
                    output_formats: ['esm'],
                    runtime: 'browser',
                },
            ],
        })
        const config = toViteConfig(plan)

        expect(config.plugins).toEqual([])
    })

    test('exposes a build adapter with config creation', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [{ key: '*', runtime: 'browser' }],
        })
        const config = viteAdapter.createConfig?.(plan) as
            ReturnType<typeof toViteConfigs> | undefined

        expect(viteAdapter.name).toBe('vite')
        expect(config).toHaveLength(1)
        expect(config?.[0]?.build?.lib).toMatchObject({
            name: 'BuildConfig',
        })
    })

    test('throws when selected entry is missing', () => {
        const plan = defineBuildPlan(parsedPkg)

        expect(() => toViteConfig(plan, './missing')).toThrow(
            'Build plan entry not found',
        )
    })

    test('throws when selected entry is node-only', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [{ key: '*', runtime: 'node' }],
        })

        expect(() => toViteConfig(plan)).toThrow(
            'Vite adapter only supports browser and universal entries',
        )
    })
})
