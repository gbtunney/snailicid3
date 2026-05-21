// ── Tsdown adapter — Rolldown-powered library bundling ───────────────────────
export {
    entryToTsdownConfig,
    toTsdownConfigs,
} from './adapters/tsdown/index.js'
export type { TsdownConfigInput } from './adapters/tsdown/index.js'

// ── Banner ────────────────────────────────────────────────────────────────────
export { createBanner, schemaPackageMetaBanner } from './build/banner.js'
export type { BannerPackageMeta } from './build/banner.js'

// ── Plan (plan2) ──────────────────────────────────────────────────────────────
export * from './build/plan2.js'

// ── Build port ────────────────────────────────────────────────────────────────
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
    // schemaBasePackage,
    // schemaRequiredScripts,
} from './build/schemas/package.js'

// ── Typedoc ───────────────────────────────────────────────────────────────────
export { docServer, typedoc } from './typedoc/index.js'
export type * from './typedoc/index.js'

// ── Vitest ────────────────────────────────────────────────────────────────────
export { vitest } from './vitest/index.js'
export type { VitestConfig } from './vitest/index.js'

export { merge } from 'ts-deepmerge'
