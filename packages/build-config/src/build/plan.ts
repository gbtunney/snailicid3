/** BuildPlan helpers and constructors. */

import path from 'path'
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
 * Adding this field to a package's `package.json` makes its build identity explicit and machine-readable. The
 * `identityFromPackage()` helper reads it.
 *
 * @example
 *     ;```json
 *     {
 *       "buildConfig": {
 *         "runtime": "node",
 *         "product": "library",
 *         "buildStrategy": "bundle"
 *       }
 *     }
 *     ```
 */
export type PackageBuildConfig = {
    runtime: Runtime
    product: Product
    buildStrategy: BuildStrategy
}

/**
 * Read a {@link PackageIdentity} from a `package.json` object's `buildConfig` field. Returns `undefined` if the field is
 * absent.
 *
 * Intended for use in `rollup.config.mts` files so the identity is defined once in `package.json` rather than repeated
 * in every config file.
 *
 * @example
 *     ;```ts
 *     import pkg from './package.json' with { type: 'json' }
 *     import { identityFromPackage, defineIdentity } from '@snailicid3/build-config'
 *
 *     const identity = identityFromPackage(pkg) ?? defineIdentity('node', 'library', 'bundle')
 *     ```
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

/** File extensions for each output kind. */
const OUTPUT_KIND_EXT: Record<OutputKind, string> = {
    cjs: '.cjs',
    esm: '.js',
    iife: '-iife.js',
    umd: '-umd.js',
}

/**
 * Generate a `package.json` `exports` field from a {@link BuildPlan}.
 *
 * Conditions are ordered per Node.js spec (most-specific first): `types` → `import` → `require` → `browser` →
 * `default`.
 *
 * - `iife` and `umd` both map to the `"browser"` condition; `iife` takes priority.
 * - A `"default"` fallback is always added when any JS output is present.
 * - When an entry has `dts: true`, a `"types"` condition is prepended.
 */
export function toPackageExports(
    plan: BuildPlan,
): Record<string, Record<string, string>> {
    const result: Record<string, Record<string, string>> = {}
    const outDir = path.posix.join(
        ...path.relative('.', plan.outputDir).split(path.sep),
    )

    for (const entry of plan.entries) {
        const exportKey = normaliseExportKey(entry.key)
        const filename = resolveEntryFilename(entry.key)
        const conditions: Record<string, string> = {}

        // types — must be first per TypeScript resolution order
        if (entry.dts) {
            conditions['types'] = `./${outDir}/${filename}.d.ts`
        }

        // import (ESM)
        if (entry.outputKinds.includes('esm')) {
            conditions['import'] =
                `./${outDir}/${filename}${OUTPUT_KIND_EXT.esm}`
        }

        // require (CJS)
        if (entry.outputKinds.includes('cjs')) {
            conditions['require'] =
                `./${outDir}/${filename}${OUTPUT_KIND_EXT.cjs}`
        }

        // browser — iife takes priority over umd
        const browserKind = entry.outputKinds.includes('iife')
            ? 'iife'
            : entry.outputKinds.includes('umd')
              ? 'umd'
              : null
        if (browserKind !== null) {
            conditions['browser'] =
                `./${outDir}/${filename}${OUTPUT_KIND_EXT[browserKind]}`
        }

        // default fallback — esm preferred, then cjs, then browser format
        const defaultFile = entry.outputKinds.includes('esm')
            ? `./${outDir}/${filename}${OUTPUT_KIND_EXT.esm}`
            : entry.outputKinds.includes('cjs')
              ? `./${outDir}/${filename}${OUTPUT_KIND_EXT.cjs}`
              : browserKind !== null
                ? `./${outDir}/${filename}${OUTPUT_KIND_EXT[browserKind]}`
                : null
        if (defaultFile !== null) {
            conditions['default'] = defaultFile
        }

        result[exportKey] = conditions
    }

    return result
}
