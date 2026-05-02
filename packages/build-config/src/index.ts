// esbuild — single-file script bundles (Google Apps Script etc.)
export { esbuildAdapter, toEsbuildConfig } from './adapters/esbuild/index.js'

// ── Adapter registry ──────────────────────────────────────────────────────────
export { adapters, selectAdapter } from './adapters/index.js'
// ── Adapters ──────────────────────────────────────────────────────────────────
export { noneAdapter } from './adapters/none/index.js'

/** ── Rollup adapter ──────────────────────────────────────────────────────── */
export {
    getPluginsForPreset,
    inferPreset,
    rollupAdapter,
    toRollupConfig,
} from './adapters/rollup/index.js'
export type { RollupPluginPreset } from './adapters/rollup/index.js'

export { tscAdapter } from './adapters/tsc/index.js'

// tsdown — node/universal library bundling (Rolldown-powered)
export { toTsdownConfig, tsdownAdapter } from './adapters/tsdown/index.js'
/** Vite — browser library / web app (Rolldown-powered) */
export { toViteConfig, viteAdapter } from './adapters/vite/index.js'

// ── Banner ────────────────────────────────────────────────────────────────────
export { bannerPackageMetaSchema, createBanner } from './build/banner.js'
export type { BannerPackageMeta } from './build/banner.js'

// ── Plan helpers ──────────────────────────────────────────────────────────────
export {
    defineEntry,
    defineIdentity,
    definePlan,
    identityFromPackage,
    normaliseExportKey,
    resolveEntryFilename,
    toPackageExports,
} from './build/plan.js'
export type { PackageBuildConfig } from './build/plan.js'

// ── Build port ────────────────────────────────────────────────────────────────
export type { BuildAdapter } from './build/ports.js'

// ── Schema ────────────────────────────────────────────────────────────────────
export {
    basePackage,
    BUILD_STRATEGY,
    buildStrategySchema,
    OUTPUT_KINDS,
    outputKindSchema,
    packageIdentitySchema,
    packageJsonIdentitySchema,
    pkgSchema,
    PRODUCT_KINDS,
    productSchema,
    RUNTIME_KINDS,
    runtimeSchema,
    schemaRequiredScripts,
} from './build/schema.js'

/** Adapter-based build system for the snailicid3 monorepo. */

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

// ── Typedoc ───────────────────────────────────────────────────────────────────
export { docServer, typedoc } from './typedoc/index.js'
export type * from './typedoc/index.js'

// ── Vitest ────────────────────────────────────────────────────────────────────
export { vitest } from './vitest/index.js'
export type { VitestConfig } from './vitest/index.js'

export { merge } from 'ts-deepmerge'
