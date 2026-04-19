/**
 * Tsc adapter — runs `tsc --build` for the package.
 *
 * Used for the majority of packages: libraries, CLIs, build tools, and anything that does not require bundling.
 * Produces compiled JS and `.d.ts` declarations while preserving the module structure.
 */

import { execSync } from 'child_process'
import type { BuildAdapter } from '../../build/ports.js'
import type { BuildPlan, Product, Runtime } from '../../build/types.js'

/** Products that default to transpile-only (tsc). */
const TSC_PRODUCTS: Array<Product> = [
    'library',
    'cli',
    'build_tool',
    'plugin',
    'worker',
    'server_app',
]

export const tscAdapter: BuildAdapter = {
    async build(plan: BuildPlan): Promise<void> {
        // Run tsc --build from the package's source directory.
        execSync('tsc --build', {
            cwd: plan.sourceDir,
            stdio: 'inherit',
        })
    },

    createConfig(_plan: BuildPlan): null {
        // tsc uses tsconfig.json, not a programmatic config object.
        return null
    },

    name: 'tsc',

    supports(_runtime: Runtime, product: Product): boolean {
        return TSC_PRODUCTS.includes(product)
    },
}
