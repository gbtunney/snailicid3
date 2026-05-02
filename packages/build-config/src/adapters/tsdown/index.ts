/**
 * Tsdown adapter.
 *
 * Used when multiple output formats are needed (ESM + CJS, IIFE, UMD). Powered by Rolldown under the hood — no plugin
 * configuration required. DTS bundling is handled natively via `dts: true` on EntrySpec.
 */

import { build } from 'tsdown'
import { toTsdownConfig } from './to-tsdown.js'
import type { BuildAdapter } from '../../build/ports.js'
import type { BuildPlan, Product, Runtime } from '../../build/types.js'

/** Products handled by the tsdown adapter when buildStrategy is 'bundle'. */
const TSDOWN_PRODUCTS: Array<Product> = [
    'library',
    'cli',
    'plugin',
    'worker',
    'server_app',
    'web_app',
]

export const tsdownAdapter: BuildAdapter = {
    async build(plan: BuildPlan): Promise<void> {
        await build(toTsdownConfig(plan))
    },

    createConfig(plan: BuildPlan): ReturnType<typeof toTsdownConfig> {
        return toTsdownConfig(plan)
    },

    name: 'tsdown',

    supports(_runtime: Runtime, product: Product): boolean {
        return TSDOWN_PRODUCTS.includes(product)
    },
}

export { toTsdownConfig } from './to-tsdown.js'
