/**
 * BuildPlan helpers and constructors.
 */

import type {
    BuildPlan,
    BuildStrategy,
    EntrySpec,
    OutputKind,
    PackageIdentity,
    Product,
    Runtime,
} from './types.js'

/**
 * The shape of the `buildConfig` field in `package.json`.
 *
 * Adding this field to a package's `package.json` makes its build identity
 * explicit and machine-readable. The `identityFromPackage()` helper reads it.
 *
 * @example
 * ```json
 * {
 *   "buildConfig": {
 *     "runtime": "node",
 *     "product": "library",
 *     "buildStrategy": "bundle"
 *   }
 * }
 * ```
 */
export type PackageBuildConfig = {
    runtime: Runtime
    product: Product
    buildStrategy: BuildStrategy
}

/**
 * Read a {@link PackageIdentity} from a `package.json` object's `buildConfig`
 * field. Returns `undefined` if the field is absent.
 *
 * Intended for use in `rollup.config.mts` files so the identity is defined
 * once in `package.json` rather than repeated in every config file.
 *
 * @example
 * ```ts
 * import pkg from './package.json' with { type: 'json' }
 * import { identityFromPackage, defineIdentity } from '@snailicid3/build-config'
 *
 * const identity = identityFromPackage(pkg) ?? defineIdentity('node', 'library', 'bundle')
 * ```
 */
export function identityFromPackage(pkg: {
    buildConfig?: { runtime: string; product: string; buildStrategy: string }
}): PackageIdentity | undefined {
    if (!pkg.buildConfig) return undefined
    return defineIdentity(
        pkg.buildConfig.runtime as Runtime,
        pkg.buildConfig.product as Product,
        pkg.buildConfig.buildStrategy as BuildStrategy,
    )
}

/** Create a {@link PackageIdentity}. */
export function defineIdentity(
    runtime: Runtime,
    product: Product,
    buildStrategy: BuildStrategy,
): PackageIdentity {
    return { buildStrategy, product, runtime }
}

/** Create an {@link EntrySpec} with defaults applied. */
export function defineEntry(
    key: string,
    outputKinds: Array<OutputKind>,
    options: Omit<EntrySpec, 'key' | 'outputKinds'> = {},
): EntrySpec {
    return { key, outputKinds, sourcemap: true, ...options }
}

/** Create a {@link BuildPlan}. */
export function definePlan(
    identity: PackageIdentity,
    sourceDir: string,
    outputDir: string,
    entries: Array<EntrySpec>,
): BuildPlan {
    return { entries, identity, outputDir, sourceDir }
}

/**
 * Resolve the output filename stem for an entry key.
 *
 * - `"."` → `"index"`
 * - `"./utils"` → `"utils"`
 * - `"utils"` → `"utils"`
 */
export function resolveEntryFilename(key: string): string {
    if (key === '.' || key === '*' || key === 'main') return 'index'
    return key.replace(/^\.\//, '')
}

/**
 * Normalise an entry key to always start with `"./"` (or `"."` for the root).
 *
 * - `"."` stays `"."`
 * - `"utils"` → `"./utils"`
 * - `"./utils"` stays `"./utils"`
 */
export function normaliseExportKey(key: string): string {
    if (key === '.' || key === '*' || key === 'main') return '.'
    return key.startsWith('./') ? key : `./${key}`
}
