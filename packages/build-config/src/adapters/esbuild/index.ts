/**
 * Esbuild adapter.
 *
 * Used for `script` products (Google Apps Script, standalone bundles) where everything must be inlined into a single
 * file. No externals, no DTS, no plugins required — esbuild handles TypeScript natively.
 *
 * For multi-format library builds, use the tsdown adapter instead.
 */

import { build } from 'esbuild'
import { toEsbuildConfig } from './to-esbuild.js'
import type { BuildAdapter } from '../../build/ports.js'
import type { BuildPlan, Product, Runtime } from '../../build/types.js'

export const esbuildAdapter: BuildAdapter = {
    async build(plan: BuildPlan): Promise<void> {
        const configs = toEsbuildConfig(plan)
        for (const config of configs) {
            await build(config)
        }
    },

    createConfig(plan: BuildPlan): ReturnType<typeof toEsbuildConfig> {
        return toEsbuildConfig(plan)
    },

    name: 'esbuild',

    supports(_runtime: Runtime, product: Product): boolean {
        return product === 'script'
    },
}

export { toEsbuildConfig } from './to-esbuild.js'
