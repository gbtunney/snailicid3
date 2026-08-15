// ── Tsdown adapter — Rolldown-powered library bundling ───────────────────────
export {
    defineTsdownConfig,
    entryToTsdownConfig,
    toTsdownConfig,
    toTsdownConfigs,
} from './adapters/tsdown/index.js'
export type { TsdownConfigInput } from './adapters/tsdown/index.js'

// ── Vite adapter — Browser/universal library bundling ───────────────────────
export {
    defineViteConfig,
    docServer,
    entryToViteConfig,
    toViteConfig,
    toViteConfigs,
    viteAdapter,
} from './adapters/vite/index.js'
export type { ViteConfigInput } from './adapters/vite/index.js'

// ── Banner ────────────────────────────────────────────────────────────────────
export { createBanner, schemaPackageMetaBanner } from './build/banner.js'
export type { BannerPackageMeta } from './build/banner.js'

// ── Plan ─────────────────────────────────────────────────────────────────────
// Enumerated rather than `export *`: a star re-export silently republishes whatever the module happens to
// export, so the packaged surface drifts without an intentional change here or in the API report.
export {
    defineBuildPlan,
    deriveBuildPlanEntry,
    entryKeyToSlug,
    isRootEntryKey,
    packageNameToDisplayName,
    packageNameToModuleName,
    toPackageExportsPlan,
} from './build/plan.js'
export type {
    BuildPlanEntryBase,
    BuildPlanEntryInput,
    BuildPlanPackage,
    BuildPlanRoot,
    DefineBuildPlanInput,
    PackageExportExtensionPreset,
    PackageExportExtensions,
    ResolvedBuildPlan,
    ResolvedBuildPlanEntry,
    ToPackageExportsPlanOptions,
} from './build/plan.js'

// ── Build port ────────────────────────────────────────────────────────────────
export {
    findPlanEntries,
    getPlanEntry,
    hasPlanEntry,
    normalizePlanEntryKey,
} from './build/ports.js'
export type { BuildAdapter } from './build/ports.js'

// ── Schemas ───────────────────────────────────────────────────────────────────
export {
    BUILD_STRATEGY,
    OUTPUT_KINDS,
    PRODUCT_KINDS,
    RUNTIME_KINDS,
} from './build/schemas/index.js'
export {
    parsePackage,
    // SchemaBasePackage,
    // schemaRequiredScripts,
} from './build/schemas/package.js'

export { merge } from 'ts-deepmerge'
