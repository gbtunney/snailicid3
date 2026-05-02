/** Translate a {@link BuildPlan} into tsdown Options. */

import type { Options } from 'tsdown'
import path from 'path'
import { resolveEntryFilename } from '../../build/plan.js'
import type { BuildPlan } from '../../build/types.js'

/**
 * Translate a {@link BuildPlan} into a tsdown {@link Options} object.
 *
 * Tsdown accepts multiple entry points in a single call, unlike rollup which required one config per entry.
 */
export function toTsdownConfig(plan: BuildPlan): Options {
    const entry: Record<string, string> = {}
    for (const e of plan.entries) {
        const filename = resolveEntryFilename(e.key)
        const inputFile = e.input
            ? path.resolve(plan.sourceDir, e.input)
            : path.resolve(plan.sourceDir, `${filename}.ts`)
        entry[filename] = inputFile
    }

    // Collect the union of all format+options across entries.
    // tsdown applies one format list to all entries; individual overrides aren't
    // supported at the Options level (use separate build() calls if needed).
    const formats: Array<string> =
        plan.entries.length > 0 ? plan.entries[0].outputKinds : ['esm']
    const dts = plan.entries.some((e) => e.dts)
    const sourcemap = plan.entries.every((e) => e.sourcemap !== false)
    const minify = plan.entries.some((e) => e.minify)

    const platform =
        plan.identity.runtime === 'node'
            ? 'node'
            : plan.identity.runtime === 'browser'
              ? 'browser'
              : 'neutral'

    return {
        clean: true,
        dts,
        entry,
        format: formats as Options['format'],
        minify,
        outDir: plan.outputDir,
        platform,
        sourcemap,
    }
}
