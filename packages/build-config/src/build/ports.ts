/**
 * BuildAdapter port — the interface all adapters implement.
 *
 * The core build system interacts only with this interface, never with
 * Rollup, Vite, esbuild, or other tool-specific types directly.
 */

import type { BuildPlan, Product, Runtime } from './types.js'

export interface BuildAdapter {
    /** Human-readable adapter name (e.g. `"rollup"`, `"tsc"`). */
    name: string

    /**
     * Returns true if this adapter can handle the given runtime and product
     * combination. Used by {@link selectAdapter} to pick the right adapter.
     */
    supports(runtime: Runtime, product: Product): boolean

    /** Execute the build described by `plan`. */
    build(plan: BuildPlan): Promise<void>

    /**
     * Optionally return the tool-specific configuration object (e.g. a
     * `RollupOptions[]` array) without executing a build. Useful for
     * inspecting or exporting config.
     */
    createConfig?(plan: BuildPlan): unknown
}
