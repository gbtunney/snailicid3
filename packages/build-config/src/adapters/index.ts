/**
 * Adapter registry.
 *
 * Adapters are checked in priority order. The first adapter whose
 * `supports()` returns true is selected for a given plan.
 *
 * Priority:
 * 1. noneAdapter   — config/script products need no build step
 * 2. rollupAdapter — selected only when buildStrategy is 'bundle'
 * 3. tscAdapter    — default for everything else
 */

import type { BuildAdapter } from '../build/ports.js'
import type { BuildPlan, Product, Runtime } from '../build/types.js'
import { noneAdapter } from './none/index.js'
import { rollupAdapter } from './rollup/index.js'
import { tscAdapter } from './tsc/index.js'

export const adapters: BuildAdapter[] = [noneAdapter, rollupAdapter, tscAdapter]

/**
 * Select the appropriate adapter for a plan.
 *
 * When `buildStrategy` is `'bundle'`, the Rollup adapter is preferred if it
 * supports the product. Otherwise the tsc adapter is the fallback.
 */
export function selectAdapter(plan: BuildPlan): BuildAdapter | undefined {
    const { runtime, product, buildStrategy } = plan.identity

    if (buildStrategy === 'none') return noneAdapter
    if (buildStrategy === 'bundle') {
        const bundler = [rollupAdapter].find((a) => a.supports(runtime, product))
        if (bundler) return bundler
    }

    return adapters.find((a) => a.supports(runtime, product))
}

export { noneAdapter } from './none/index.js'
export {
    rollupAdapter,
    toRollupConfig,
    toPackageExports,
    getPluginsForPreset,
    inferPreset,
} from './rollup/index.js'
export type { RollupPluginPreset } from './rollup/index.js'
export { tscAdapter } from './tsc/index.js'

export type { BuildAdapter } from '../build/ports.js'

// Re-export plan helpers for convenience
export {
    defineEntry,
    defineIdentity,
    definePlan,
    normaliseExportKey,
    resolveEntryFilename,
} from '../build/plan.js'
export { createBanner } from '../build/banner.js'
export type { BannerPackageMeta } from '../build/banner.js'
