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
})

export {}
