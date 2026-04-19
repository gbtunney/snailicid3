/**
 * Adapter registry.
 *
 * Adapters are checked in priority order. The first adapter whose `supports()` returns true is selected for a given
 * plan.
 *
 * Priority:
 *
 * 1. NoneAdapter — config/script products need no build step
 * 2. RollupAdapter — selected only when buildStrategy is 'bundle'
 * 3. TscAdapter — default for everything else
 */

import { noneAdapter } from './none/index.js'
import { rollupAdapter } from './rollup/index.js'
import { tscAdapter } from './tsc/index.js'
import type { BuildAdapter } from '../build/ports.js'
import type { BuildPlan } from '../build/types.js'

export const adapters: Array<BuildAdapter> = [
    noneAdapter,
    rollupAdapter,
    tscAdapter,
]

/**
 * Select the appropriate adapter for a plan.
 *
 * When `buildStrategy` is `'bundle'`, the Rollup adapter is preferred if it supports the product. Otherwise the tsc
 * adapter is the fallback.
 */
export function selectAdapter(plan: BuildPlan): BuildAdapter | undefined {
    const { buildStrategy, product, runtime } = plan.identity

    if (buildStrategy === 'none') return noneAdapter
    if (buildStrategy === 'bundle') {
        const bundler = [rollupAdapter].find((a) =>
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
} from '../build/plan.js'
export type { BuildAdapter } from '../build/ports.js'

export { noneAdapter } from './none/index.js'

export {
    getPluginsForPreset,
    inferPreset,
    rollupAdapter,
    toPackageExports,
    toRollupConfig,
} from './rollup/index.js'
export type { RollupPluginPreset } from './rollup/index.js'
export { tscAdapter } from './tsc/index.js'
