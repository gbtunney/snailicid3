/**
 * Vite adapter (library mode).
 *
 * Used for browser libraries that need asset handling, CSS processing, or other Vite-specific transforms. Pure
 * TypeScript libraries should prefer the tsdown adapter. Web app products (non-library) use Vite's normal app mode and
 * should configure vite.config.ts directly.
 *
 * Powered by Rolldown in Vite 8+.
 */

import { build } from 'vite'
import { toViteConfig } from './to-vite.js'
import type { BuildAdapter } from '../../build/ports.js'
import type { BuildPlan, Product, Runtime } from '../../build/types.js'

/** Products handled by the Vite adapter when buildStrategy is 'bundle'. */
const VITE_PRODUCTS: Array<Product> = ['web_app']

export const viteAdapter: BuildAdapter = {
    async build(plan: BuildPlan): Promise<void> {
        await build(toViteConfig(plan, plan.identity.product))
    },

    createConfig(plan: BuildPlan): ReturnType<typeof toViteConfig> {
        return toViteConfig(plan, plan.identity.product)
    },

    name: 'vite',

    supports(_runtime: Runtime, product: Product): boolean {
        return VITE_PRODUCTS.includes(product)
    },
}

export { toViteConfig } from './to-vite.js'
