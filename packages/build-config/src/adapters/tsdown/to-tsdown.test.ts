import { describe, expect, test } from 'vitest'
import pkg from './../../../package.json' with { type: 'json' }
import { schemaBasePackage } from './../../build/schemas/package.js'
import { entryToTsdownConfig, toTsdownConfigs } from './to-tsdown.js'
import { defineBuildPlan } from '../../build/plan2.js'

const parsedPkg = schemaBasePackage.parse(pkg)

describe('tsdownv2 adapter', () => {
    test('maps one entry per plan entry', () => {
        const plan = defineBuildPlan(parsedPkg)
        const configs = toTsdownConfigs(plan)

        expect(configs).toHaveLength(1)
    })

    test('maps multiple entries to multiple configs', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [
                { key: '*', sourceFile: 'index.ts' },
                { key: './vitest', sourceFile: 'vitest/index.ts' },
            ],
        })
        const configs = toTsdownConfigs(plan)

        expect(configs).toHaveLength(2)
    })

    test('ts in output_formats sets dts:true and is stripped from format list', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [{ key: '*', output_formats: ['esm', 'cjs', 'ts'] }],
        })
        const [config] = toTsdownConfigs(plan)

        expect(config.dts).toBe(true)
        expect(config.format).not.toContain('ts')
        expect(config.format).toContain('esm')
        expect(config.format).toContain('cjs')
    })

    test('no ts in output_formats leaves dts:false', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [{ key: '*', output_formats: ['esm', 'cjs'] }],
        })
        const [config] = toTsdownConfigs(plan)

        expect(config.dts).toBe(false)
    })

    test('global format sets globalName from moduleName', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [{ key: '*', output_formats: ['iife'] }],
        })
        const entry = plan.entries[0]
        const config = entryToTsdownConfig(entry, plan)

        expect(config.globalName).toBe(entry.moduleName)
    })

    test('module-only formats do not set globalName', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [{ key: '*', output_formats: ['esm', 'cjs'] }],
        })
        const entry = plan.entries[0]
        const config = entryToTsdownConfig(entry, plan)

        expect(config.globalName).toBeUndefined()
    })

    test('entry sourcePath is used as entry point', () => {
        const plan = defineBuildPlan(parsedPkg)
        const entry = plan.entries[0]
        const config = entryToTsdownConfig(entry, plan)

        expect(config.entry).toEqual({ [entry.fileName]: entry.sourcePath })
    })

    test('banner content is passed through when present', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [{ banner: true, key: '*' }],
        })
        const entry = plan.entries[0]
        const config = entryToTsdownConfig(entry, plan)

        expect(config.banner).toBeDefined()
        expect(typeof config.banner).toBe('string')
    })

    test('no banner when banner:false on entry', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [{ banner: false, key: '*' }],
        })
        const entry = plan.entries[0]
        const config = entryToTsdownConfig(entry, plan)

        expect(config.banner).toBeUndefined()
    })

    test('platform neutral for universal runtime', () => {
        const plan = defineBuildPlan(parsedPkg, {
            root: { runtime: 'universal' },
        })
        const [config] = toTsdownConfigs(plan)

        expect(config.platform).toBe('neutral')
    })

    test('platform node for node runtime', () => {
        const plan = defineBuildPlan(parsedPkg, { root: { runtime: 'node' } })
        const [config] = toTsdownConfigs(plan)

        expect(config.platform).toBe('node')
    })

    test('entry runtime override maps platform from merged entry runtime', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [{ key: '*', runtime: 'node' }],
            root: { runtime: 'universal' },
        })
        const [config] = toTsdownConfigs(plan)

        expect(config.platform).toBe('node')
    })

    test('outDir comes from entry outputDir', () => {
        const plan = defineBuildPlan(parsedPkg, {
            root: { outputDir: './lib' },
        })
        const [config] = toTsdownConfigs(plan)

        expect(config.outDir).toBe('./lib')
    })

    test('transpile:true omits target so tsdown can infer defaults', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [{ key: '*', transpile: true }],
        })
        const [config] = toTsdownConfigs(plan)

        expect(config.target).toBeUndefined()
    })

    test('transpile:false maps to target:esnext', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [{ key: '*', transpile: false }],
        })
        const [config] = toTsdownConfigs(plan)

        expect(config.target).toBe('esnext')
    })

    test('transpile:none maps to target:esnext', () => {
        const plan = defineBuildPlan(parsedPkg, {
            entries: [{ key: '*', transpile: 'none' }],
        })
        const [config] = toTsdownConfigs(plan)

        expect(config.target).toBe('esnext')
    })

    test('transpile array passes explicit targets through', () => {
        const explicitTargets: Array<'chrome120.0.0' | 'node20.0.0'> = [
            'node20.0.0',
            'chrome120.0.0',
        ]
        const plan = defineBuildPlan(parsedPkg, {
            entries: [{ key: '*', transpile: explicitTargets }],
        })
        const [config] = toTsdownConfigs(plan)

        expect(config.target).toEqual(explicitTargets)
    })
})
