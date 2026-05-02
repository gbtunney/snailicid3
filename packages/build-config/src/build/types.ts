/**
 * Tool-agnostic build domain model.
 *
 * These types must remain independent from Rollup, Vite, esbuild, and any other bundler. Adapters translate a
 * {@link BuildPlan} into tool-specific configuration.
 */
export type {
    BuildStrategy,
    OutputKind,
    PackageIdentity,
    Product,
    Runtime,
} from './schema.js'
import type { OutputKind, PackageIdentity } from './schema.js'

/**
 * A tool-agnostic description of how to build a package.
 *
 * Adapters receive this and translate it into tool-specific configuration.
 */
export type BuildPlan = {
    entries: Array<EntrySpec>
    identity: PackageIdentity
    /** Directory where compiled output is written. */
    outputDir: string
    /** Directory containing TypeScript source files. */
    sourceDir: string
}

/**
 * A single entrypoint in a build plan.
 *
 * `key` maps to an export path in `package.json#exports` (e.g. `"."` or `"./utils"`). Adapters are responsible for
 * translating this into the correct output path and exports field entry.
 */
export type EntrySpec = {
    /** Prepend a generated banner comment to outputs. */
    banner?: boolean
    /** Emit bundled TypeScript declarations alongside JS outputs. */
    dts?: boolean
    /** Source file path relative to {@link BuildPlan.sourceDir}. Defaults to the resolved key name. */
    input?: string
    /** Export path key (e.g. `"."`, `"./utils"`). */
    key: string
    /** Minify the output. */
    minify?: boolean
    /** Output formats to emit for this entry. */
    outputKinds: Array<OutputKind>
    /** Emit source maps. */
    sourcemap?: boolean
}
