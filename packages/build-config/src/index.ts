/**
 * @snailicid3/build-config
 *
 * tsc-first, adapter-based build system for the snailicid3 monorepo.
 *
 * @see ARCHITECTURE.md for design documentation.
 */

// ── Domain model ─────────────────────────────────────────────────────────────
export type {
    BuildPlan,
    BuildStrategy,
    EntrySpec,
    OutputKind,
    PackageIdentity,
    Product,
    Runtime,
} from './build/types.js'

// ── Build port ────────────────────────────────────────────────────────────────
export type { BuildAdapter } from './build/ports.js'

// ── Plan helpers ──────────────────────────────────────────────────────────────
export {
    defineEntry,
    defineIdentity,
    definePlan,
    normaliseExportKey,
    resolveEntryFilename,
} from './build/plan.js'

// ── Banner ────────────────────────────────────────────────────────────────────
export { createBanner } from './build/banner.js'
export type { BannerPackageMeta } from './build/banner.js'

// ── Adapter registry ──────────────────────────────────────────────────────────
export { adapters, selectAdapter } from './adapters/index.js'
export { noneAdapter } from './adapters/none/index.js'
export { tscAdapter } from './adapters/tsc/index.js'

// ── Rollup adapter ────────────────────────────────────────────────────────────
export {
    getPluginsForPreset,
    inferPreset,
    rollupAdapter,
    toPackageExports,
    toRollupConfig,
} from './adapters/rollup/index.js'
export type { RollupPluginPreset } from './adapters/rollup/index.js'

// ── Tool configs ──────────────────────────────────────────────────────────────
export { vite, viteDocServerConfig } from './vite/index.js'
export type { ViteUserConfig } from './vite/index.js'

export { vitest, viTestConfig } from './vitest/index.js'
export type { VitestUserConfig } from './vitest/index.js'
