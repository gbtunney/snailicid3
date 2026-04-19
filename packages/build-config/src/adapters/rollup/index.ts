/**
 * Rollup adapter.
 *
 * Used when multiple output formats are needed (ESM + CJS, IIFE, UMD), or
 * when browser library builds require controlled, tree-shaken output.
 */

import { rollup } from 'rollup'
import { toRollupConfig } from './to-rollup.js'
import type { BuildAdapter } from '../../build/ports.js'
import type { BuildPlan, Product, Runtime } from '../../build/types.js'

/** Products that may use the Rollup adapter when buildStrategy is 'bundle'. */
const ROLLUP_PRODUCTS: Array<Product> = ['library', 'cli', 'plugin', 'worker', 'server_app', 'web_app']

export const rollupAdapter: BuildAdapter = {
    async build(plan: BuildPlan): Promise<void> {
        const configs = toRollupConfig(plan, plan.identity.product)
        for (const config of configs) {
            const bundle = await rollup(config)
            const outputs = Array.isArray(config.output)
                ? config.output
                : config.output
                  ? [config.output]
                  : []
            for (const output of outputs) {
                await bundle.write(output)
            }
            await bundle.close()
        }
    },

    createConfig(plan: BuildPlan): ReturnType<typeof toRollupConfig> {
        return toRollupConfig(plan, plan.identity.product)
    },

    name: 'rollup',

    supports(runtime: Runtime, product: Product): boolean {
        void runtime
        return ROLLUP_PRODUCTS.includes(product)
    },
}

export { getPluginsForPreset, inferPreset } from './plugins.js'
export type { RollupPluginPreset } from './plugins.js'
export { toPackageExports, toRollupConfig } from './to-rollup.js'
