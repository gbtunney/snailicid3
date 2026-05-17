import { defineBuildPlan, toTsdownConfigs } from '@snailicid3/build-config'
import { defineConfig } from 'tsdown'
import pkg from './package.json' with { type: 'json' }

const plan = defineBuildPlan(pkg, {
    entries: [
        {
            key: '*',
            lint: true,
            output_formats: ['esm', 'cjs', 'ts'],
        },
        {
            include_dependencies: true,
            key: '*',
            output_formats: ['iife'],
            runtime: 'browser',
        },
    ],
    root: {
        outputDir: './dist',
        sourceDir: './src',
    },
})

const tsdownConfigs = toTsdownConfigs(plan)

export default defineConfig(tsdownConfigs)
