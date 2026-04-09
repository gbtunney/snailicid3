/**
 * Tool-agnostic build domain model.
 *
 * These types must remain independent from Rollup, Vite, esbuild, and any
 * other bundler. Adapters translate a {@link BuildPlan} into tool-specific
 * configuration.
 */

/** Where code executes. */
export type Runtime = 'node' | 'browser' | 'universal' | 'edge'

/** What the package is for — how it is consumed or invoked. */
export type Product =
    | 'library'
    | 'cli'
    | 'config'
    | 'build_tool'
    | 'plugin'
    | 'web_app'
    | 'server_app'
    | 'worker'
    | 'script'

/** How the artifact is produced. */
export type BuildStrategy = 'transpile' | 'bundle' | 'none'

/** How the built artifact is emitted. */
export type OutputKind = 'esm' | 'cjs' | 'iife' | 'umd'

/** The three core classification axes for a package. */
export interface PackageIdentity {
    runtime: Runtime
    product: Product
    buildStrategy: BuildStrategy
}

/**
 * A single entrypoint in a build plan.
 *
 * `key` maps to an export path in `package.json#exports` (e.g. `"."` or
 * `"./utils"`). Adapters are responsible for translating this into the correct
 * output path and exports field entry.
 */
export interface EntrySpec {
    /** Export path key (e.g. `"."`, `"./utils"`). */
    key: string
    /** Source file path relative to {@link BuildPlan.sourceDir}. Defaults to the resolved key name. */
    input?: string
    /** Output formats to emit for this entry. */
    outputKinds: OutputKind[]
    /** Prepend a generated banner comment to outputs. */
    banner?: boolean
    /** Minify the output. */
    minify?: boolean
    /** Emit source maps. */
    sourcemap?: boolean
}

/**
 * A tool-agnostic description of how to build a package.
 *
 * Adapters receive this and translate it into tool-specific configuration.
 */
export interface BuildPlan {
    identity: PackageIdentity
    /** Directory containing TypeScript source files. */
    sourceDir: string
    /** Directory where compiled output is written. */
    outputDir: string
    entries: EntrySpec[]
}
