import { defineBuildPlan, toTsdownConfigs } from '@snailicid3/build-config'
import { defineConfig } from 'tsdown'
import pkg from './package.json' with { type: 'json' }

const plan = defineBuildPlan(pkg, {
    entries: [
        {
            key: '*',
            // Refs #82
            // TODO lint=false is temporary fix for strange tsdown memory errors
            lint: false,
            output_formats: ['esm', 'cjs', 'iife', 'ts'],
        },
    ],
    root: {
        outputDir: './dist',
        sourceDir: './src',
    },
})

const tsdownConfigs = toTsdownConfigs(plan)

export default defineConfig(tsdownConfigs)
