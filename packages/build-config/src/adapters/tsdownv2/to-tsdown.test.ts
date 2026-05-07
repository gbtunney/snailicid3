import { describe, expect, test } from 'vitest'
import pkg from './../../../package.json' with { type: 'json' }
import { defineBuildPlan } from '../../build/plan2.js'
import { entryToTsdownConfig, toTsdownConfigs } from './to-tsdown.js'

const basePkg = pkg

describe('tsdownv2 adapter', () => {
    test('maps one entry per plan entry', () => {
        const plan = defineBuildPlan(basePkg)
        const configs = toTsdownConfigs(plan)

        expect(configs).toHaveLength(1)
    })

    test('maps multiple entries to multiple configs', () => {
        const plan = defineBuildPlan(basePkg, {
            entries: [
                { key: '*', sourceFile: 'index.ts' },
                { key: './vitest', sourceFile: 'vitest/index.ts' },
            ],
        })
        const configs = toTsdownConfigs(plan)

        expect(configs).toHaveLength(2)
    })

    test('ts in output_formats sets dts:true and is stripped from format list', () => {
        const plan = defineBuildPlan(basePkg, {
            entries: [{ key: '*', output_formats: ['esm', 'cjs', 'ts'] }],
        })
        const [config] = toTsdownConfigs(plan)

        expect(config?.dts).toBe(true)
        expect(config?.format).not.toContain('ts')
        expect(config?.format).toContain('esm')
        expect(config?.format).toContain('cjs')
    })

    test('no ts in output_formats leaves dts:false', () => {
        const plan = defineBuildPlan(basePkg, {
            entries: [{ key: '*', output_formats: ['esm', 'cjs'] }],
        })
        const [config] = toTsdownConfigs(plan)

        expect(config?.dts).toBe(false)
    })

    test('global format sets globalName from moduleName', () => {
        const plan = defineBuildPlan(basePkg, {
            entries: [{ key: '*', output_formats: ['iife'] }],
        })
        const entry = plan.entries[0]!
        const config = entryToTsdownConfig(entry, plan)

        expect(config.globalName).toBe(entry.moduleName)
    })

    test('module-only formats do not set globalName', () => {
        const plan = defineBuildPlan(basePkg, {
            entries: [{ key: '*', output_formats: ['esm', 'cjs'] }],
        })
        const entry = plan.entries[0]!
        const config = entryToTsdownConfig(entry, plan)

        expect(config.globalName).toBeUndefined()
    })

    test('entry sourcePath is used as entry point', () => {
        const plan = defineBuildPlan(basePkg)
        const entry = plan.entries[0]!
        const config = entryToTsdownConfig(entry, plan)

        expect(config.entry).toEqual({ [entry.fileName]: entry.sourcePath })
    })

    test('banner content is passed through when present', () => {
        const plan = defineBuildPlan(basePkg, {
            entries: [{ key: '*', banner: true }],
        })
        const entry = plan.entries[0]!
        const config = entryToTsdownConfig(entry, plan)

        expect(config.banner).toBeDefined()
        expect(typeof config.banner).toBe('string')
    })

    test('no banner when banner:false on entry', () => {
        const plan = defineBuildPlan(basePkg, {
            entries: [{ key: '*', banner: false }],
        })
        const entry = plan.entries[0]!
        const config = entryToTsdownConfig(entry, plan)

        expect(config.banner).toBeUndefined()
    })

    test('platform neutral for universal runtime', () => {
        const plan = defineBuildPlan(basePkg, { root: { runtime: 'universal' } })
        const [config] = toTsdownConfigs(plan)

        expect(config?.platform).toBe('neutral')
    })

    test('platform node for node runtime', () => {
        const plan = defineBuildPlan(basePkg, { root: { runtime: 'node' } })
        const [config] = toTsdownConfigs(plan)

        expect(config?.platform).toBe('node')
    })

    test('outDir comes from entry outputDir', () => {
        const plan = defineBuildPlan(basePkg, { root: { outputDir: './lib' } })
        const [config] = toTsdownConfigs(plan)

        expect(config?.outDir).toBe('./lib')
    })
})
