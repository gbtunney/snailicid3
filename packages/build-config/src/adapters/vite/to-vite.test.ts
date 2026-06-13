import { describe, expect, test } from 'vitest'
import pkg from './../../../package.json' with { type: 'json' }
import { entryToViteConfig, toViteConfig, toViteConfigs } from './to-vite.js'
import { defineBuildPlan } from '../../build/plan.js'
import { schemaBasePackage } from '../../build/schemas/package.js'

const parsedPkg = schemaBasePackage.parse(pkg)

describe('vite adapter', () => {
    test('maps browser library entries to Vite lib config', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [
                {
                    key: '*',
                    output_formats: ['esm', 'iife', 'ts'],
                    runtime: 'browser',
                },
            ],
        })
        const entry = plan.entries[0]
        const config = entryToViteConfig(entry, plan)

        expect(config.build?.lib).toEqual({
            entry: entry.sourcePath,
            fileName: 'index',
            formats: ['es', 'iife'],
            name: 'BuildConfig',
        })
        expect(config.build?.outDir).toBe('./dist')
        expect(config.build?.emptyOutDir).toBe(false)
        expect(config.logLevel).toBe(entry.logLevel)
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

        expect(config.build?.lib).toMatchObject({
            fileName: 'vitest',
            name: 'Vitest',
        })
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
