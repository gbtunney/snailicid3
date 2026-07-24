import { describe, expect, test } from 'vitest'
import { prefixTargets, selectTargets } from './utilities.js'
import { Nx } from './index.js'

const cwd = import.meta

describe('Nx export', () => {
    test('has a config function returning the merged preset', () => {
        expect(typeof Nx.config).toBe('function')
        const config = Nx.config({ cwd })
        expect(config).toHaveProperty('namedInputs')
        expect(config).toHaveProperty('targetDefaults')
    })

    test('has presets.base and presets.merge helpers', () => {
        expect(typeof Nx.presets.base).toBe('function')
        expect(typeof Nx.presets.merge).toBe('function')
    })
})

describe('Nx preset merge behavior (spec invariants)', () => {
    const { namedInputs, targetDefaults } = Nx.config({ cwd })

    test('production inputs drop markdown so docs do not bust the cache', () => {
        expect(namedInputs?.production).toContain('!{projectRoot}/**/*.md')
    })

    test('sharedGlobals include prettier config', () => {
        expect(namedInputs?.sharedGlobals).toContain(
            '{workspaceRoot}/prettier.config.ts',
        )
    })

    test('build:ts waits on the full upstream build and caches types only', () => {
        // Bundled packages emit their .d.cts from the bundler, so upstream
        // declarations only exist after `build`, not after `build:ts`.
        expect(targetDefaults?.['build:ts']?.dependsOn).toEqual(['^build'])
        expect(targetDefaults?.['build:ts']?.outputs).toEqual([
            '{projectRoot}/types',
        ])
    })

    test('build is bundler-agnostic (only build:ts)', () => {
        expect(targetDefaults?.['build']?.dependsOn).toEqual(['build:ts'])
    })

    test('mutating targets are never cached', () => {
        expect(targetDefaults?.['fix']?.cache).toBe(false)
        expect(targetDefaults?.['root:fix']?.cache).toBe(false)
        expect(targetDefaults?.['fix:md']?.cache).toBe(false)
    })

    test('exposes the full set of 32 targets including root:*', () => {
        expect(Object.keys(targetDefaults ?? {})).toHaveLength(32)
        expect(targetDefaults).toHaveProperty('root:build')
        expect(targetDefaults).toHaveProperty('lint:md')
    })
})

describe('prefixTargets / selectTargets', () => {
    const targets = {
        'build': { cache: true, dependsOn: ['build:ts'] },
        'build:ts': { cache: true, dependsOn: ['^build:ts'] },
        'other': { cache: false },
    }

    test('selectTargets picks a subset without mutating the source', () => {
        const picked = selectTargets(targets, ['build', 'missing'])
        expect(Object.keys(picked)).toEqual(['build'])
        expect(targets.build.dependsOn).toEqual(['build:ts'])
    })

    test('prefixTargets rewrites intra-set dependsOn and leaves ^-deps alone', () => {
        const prefixed = prefixTargets('root', {
            ...selectTargets(targets, ['build', 'build:ts']),
        })
        expect(prefixed['root:build']?.dependsOn).toEqual(['root:build:ts'])
        // ^-dep points outside the same project — untouched
        expect(prefixed['root:build:ts']?.dependsOn).toEqual(['^build:ts'])
    })

    test('prefixTargets returns a new object; source is untouched', () => {
        const source = { build: { dependsOn: ['build:ts'] } }
        const result = prefixTargets('root', source)
        expect(result).not.toBe(source)
        expect(source.build.dependsOn).toEqual(['build:ts'])
    })
})
