import { defineBuildPlan, toTsdownConfigs } from '@snailicid3/build-config'
import { defineConfig } from 'tsdown'
import pkg from './package.json' with { type: 'json' }

const plan = defineBuildPlan(pkg, {
    entries: [
        {
            exports: true,
            key: '*',
            output_formats: ['esm', 'ts'],
            runtime: 'node',
            //   Transpile: ['es2020']
        },
    ],
    root: {
        outputDir: './dist',
        sourceDir: './src',
    },
})

const tsdownConfigs = toTsdownConfigs(plan)

export default defineConfig(tsdownConfigs)
