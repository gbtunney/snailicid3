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
    identityFromPackage,
    normaliseExportKey,
    resolveEntryFilename,
} from './build/plan.js'
export type { PackageBuildConfig } from './build/plan.js'

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

// ── TODO: restore removed modules ─────────────────────────────────────────────
//
// The following were removed because they had broken imports from the old
// snailicide-monorepo migration. Add them back once their dependencies are
// resolved.
//
// TODO(typedoc): restore src/typedoc/ — needs deps: type-fest, ts-deepmerge,
//   typedoc-plugin-markdown, typedoc-material-theme
//   Was: config(), materialTheme(), configMarkdown(), fileSharedOptions()
//
// TODO(vitepress): restore src/vitepress/ — needs deps: vitepress, ts-deepmerge
//   Was: vitepress() config factory for VitePress sidebar/theme
//
// TODO(utilities): file extension helpers + JSON utilities — these belong in
//   @snailicid3/utils, not here. Once that package is wired up, consumers
//   should import from there instead.
//   Was: getFileExtensionList(), globFileFilter(), safeDeserializeJSON(),
//        importJSON(), getFilePath(), prettyPrintJSON(), exportJSONFile()
//        + type-fest re-exports (Jsonifiable, Merge, Simplify, etc.)
//
// TODO(logger): src/utilities.ts also imported from ./logger/index.js which
//   was never migrated. Logger belongs in @snailicid3/logger — wire up that
//   package first before restoring any code that used getLogger().
