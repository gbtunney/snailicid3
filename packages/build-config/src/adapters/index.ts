/**
 * Adapter registry.
 *
 * Adapters are checked in priority order. The first adapter whose `supports()` returns true is selected for a given
 * plan.
 *
 * Priority for `bundle` strategy:
 *
 * 1. EsbuildAdapter — script products (GAS, single-file bundles)
 * 2. ViteAdapter — web_app products
 * 3. TsdownAdapter — libraries, CLI, plugins, workers, server apps
 *
 * Other strategies:
 *
 * - `none` → noneAdapter (config/script with no build step)
 * - `transpile` → tscAdapter
 */

import { esbuildAdapter } from './esbuild/index.js'
import { noneAdapter } from './none/index.js'
import { tscAdapter } from './tsc/index.js'
import { tsdownAdapter } from './tsdown/index.js'
import { viteAdapter } from './vite/index.js'
import type { BuildAdapter } from '../build/ports.js'
import type { BuildPlan } from '../build/types.js'

export const adapters: Array<BuildAdapter> = [
    noneAdapter,
    esbuildAdapter,
    viteAdapter,
    tsdownAdapter,
    tscAdapter,
]

/** Bundler adapters tried in priority order when buildStrategy is 'bundle'. */
const BUNDLE_ADAPTERS: Array<BuildAdapter> = [
    esbuildAdapter,
    viteAdapter,
    tsdownAdapter,
]

/**
 * Select the appropriate adapter for a plan.
 *
 * - `none` strategy → noneAdapter always
 * - `bundle` strategy → first bundler whose `supports()` matches
 * - `transpile` strategy → tscAdapter (if it supports the product)
 * - Fallback → first adapter in `adapters` that supports the product
 */
export function selectAdapter(plan: BuildPlan): BuildAdapter | undefined {
    const { buildStrategy, product, runtime } = plan.identity

    if (buildStrategy === 'none') return noneAdapter
    if (buildStrategy === 'bundle') {
        const bundler = BUNDLE_ADAPTERS.find((a) =>
            a.supports(runtime, product),
        )
        if (bundler) return bundler
    }
    if (buildStrategy === 'transpile') {
        return tscAdapter.supports(runtime, product) ? tscAdapter : undefined
    }

    return adapters.find((a) => a.supports(runtime, product))
}

export { createBanner } from '../build/banner.js'
export type { BannerPackageMeta } from '../build/banner.js'
// Re-export plan helpers for convenience
export {
    defineEntry,
    defineIdentity,
    definePlan,
    normaliseExportKey,
    resolveEntryFilename,
    toPackageExports,
} from '../build/plan.js'
export type { BuildAdapter } from '../build/ports.js'

export { esbuildAdapter, toEsbuildConfig } from './esbuild/index.js'
export { noneAdapter } from './none/index.js'
export { tscAdapter } from './tsc/index.js'
export { toTsdownConfig, tsdownAdapter } from './tsdown/index.js'
export { toViteConfig, viteAdapter } from './vite/index.js'
