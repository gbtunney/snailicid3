import { defineBuildPlan, toTsdownConfigs } from '@snailicid3/build-config'
import { defineConfig } from 'tsdown'
import pkg from './package.json' with { type: 'json' }

const plan = defineBuildPlan(pkg, {
    entries: [
        {
            key: '*',
            output_formats: ['esm', 'cjs', 'ts'],
            product: 'library',
            runtime: 'universal',
            transpile: ['es2020'],
        },
        {
            key: 'demo',
            output_formats: ['esm', 'ts'],
            product: 'cli',
            runtime: 'node',
            sourceFile: 'demo-cli.ts',
            transpile: ['es2020'],
        },
        {
            key: './snail-sh',
            output_formats: ['esm', 'ts'],
            product: 'cli',
            runtime: 'node',
            sourceFile: 'cli/snail-sh.ts',
            transpile: ['es2020'],
        },
    ],
    root: {
        outputDir: './dist',
        sourceDir: './src',
    },
})

const tsdownConfigs = toTsdownConfigs(plan)

export default defineConfig(tsdownConfigs)
