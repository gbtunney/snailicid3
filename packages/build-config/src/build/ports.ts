/**
 * BuildAdapter port — the interface all adapters implement.
 *
 * The core build system interacts only with this interface, never with Rollup, Vite, esbuild, or other tool-specific
 * types directly.
 */

import type { BuildPlan, Product, Runtime } from './types.js'

export type BuildAdapter = {
    /** Execute the build described by `plan`. */
    build(plan: BuildPlan): Promise<void>

    /**
     * Optionally return the tool-specific configuration object (e.g. a `RollupOptions[]` array) without executing a
     * build. Useful for inspecting or exporting config.
     */
    createConfig?(plan: BuildPlan): unknown

    /** Human-readable adapter name (e.g. `"rollup"`, `"tsc"`). */
    name: string

    /** Returns true if this adapter can handle the given runtime and product combination. to pick the right adapter. */
    supports(runtime: Runtime, product: Product): boolean
}
