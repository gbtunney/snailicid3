/**
 * None adapter — for packages with no build step.
 *
 * Used for config-only packages, JSON schemas, and templates where files
 * are shipped as-is without any compilation.
 */

import type { BuildAdapter } from '../../build/ports.js'
import type { BuildPlan, Product, Runtime } from '../../build/types.js'

const NONE_PRODUCTS: Product[] = ['config', 'script']

export const noneAdapter: BuildAdapter = {
    name: 'none',

    supports(_runtime: Runtime, product: Product): boolean {
        return NONE_PRODUCTS.includes(product)
    },

    async build(_plan: BuildPlan): Promise<void> {
        // No build step — files are shipped as-is.
    },

    createConfig(_plan: BuildPlan): null {
        return null
    },
}
