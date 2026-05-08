/**
 * BuildAdapter port — the interface all adapters implement.
 *
 * The core build system interacts only with this interface, never with any specific bundler. Adapters translate a
 * {@link ResolvedBuildPlan} into tool-specific configuration.
 */

import type { ResolvedBuildPlan } from './plan2.js'

export type BuildAdapter = {
    /** Execute the build described by `plan`. */
    build(plan: ResolvedBuildPlan): Promise<void>

    /**
     * Optionally return the tool-specific configuration object without executing a build. Useful for inspecting or
     * exporting config.
     */
    createConfig?(plan: ResolvedBuildPlan): unknown

    /** Human-readable adapter name (e.g. `"tsdown"`, `"tsc"`). */
    name: string
}
