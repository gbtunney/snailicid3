import { defineBuildPlan, toTsdownConfigs } from '@snailicid3/build-config'
import { defineConfig } from 'tsdown'
import pkg from './package.json' with { type: 'json' }

const plan = defineBuildPlan(pkg, {
    entries: [
        {
            banner: true,
            key: '*',
            output_formats: ['esm', 'cjs', 'iife', 'ts'],
        },
        {
            banner: true,
            bundle: false,
            key: './node',
            output_formats: ['esm', 'cjs', 'ts'],
            runtime: 'node',
            sourceFile: 'node2.ts',
            transpile: ['esnext'],
        },
    ],
    root: {
        outputDir: './dist',
        sourceDir: './src',
    },
})

const toTsdownConfigsCompat = toTsdownConfigs as unknown as (
    resolvedPlan: typeof plan,
) => Parameters<typeof defineConfig>[0]

const tsdownConfigs = toTsdownConfigsCompat(plan)

export default defineConfig(tsdownConfigs)
