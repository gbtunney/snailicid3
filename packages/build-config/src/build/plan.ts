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

/** Create a {@link PackageIdentity}. */
export function defineIdentity(
    runtime: Runtime,
    product: Product,
    buildStrategy: BuildStrategy,
): PackageIdentity {
    return { runtime, product, buildStrategy }
}

/** Create an {@link EntrySpec} with defaults applied. */
export function defineEntry(
    key: string,
    outputKinds: OutputKind[],
    options: Omit<EntrySpec, 'key' | 'outputKinds'> = {},
): EntrySpec {
    return { key, outputKinds, sourcemap: true, ...options }
}

/** Create a {@link BuildPlan}. */
export function definePlan(
    identity: PackageIdentity,
    sourceDir: string,
    outputDir: string,
    entries: EntrySpec[],
): BuildPlan {
    return { identity, sourceDir, outputDir, entries }
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
