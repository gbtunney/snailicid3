/** Translate a {@link BuildPlan} into tsdown build config. */

import type { build } from 'tsdown'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { createBanner, schemaPackageMetaBanner } from '../../build/banner.js'
import type { BannerPackageMeta } from '../../build/banner.js'
import { resolveEntryFilename } from '../../build/plan.js'
import type { BuildPlan, OutputKind } from '../../build/types.js'

type TsdownBuildConfig = NonNullable<Parameters<typeof build>[0]>

/**
 * Translate a {@link BuildPlan} into a tsdown build config object.
 *
 * Tsdown accepts multiple entry points in a single call, unlike rollup which required one config per entry.
 */
export function toTsdownConfig(
    plan: BuildPlan,
    packageMeta?: BannerPackageMeta,
    moduleName: string = resolveEntryFilename(plan.entries[0]?.key ?? 'index'),
): TsdownBuildConfig {
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
    const formats: Array<OutputKind> =
        plan.entries.length > 0 ? plan.entries[0].outputKinds : ['esm']
    const dts = plan.entries.some((e) => e.dts)
    const sourcemap = plan.entries.every((e) => e.sourcemap !== false)
    const minify = plan.entries.some((e) => e.minify)
    const wantsBanner = plan.entries.some((e) => e.banner)
    const resolvedMeta = packageMeta ?? inferPackageMeta(plan)

    const platform =
        plan.identity.runtime === 'node'
            ? 'node'
            : plan.identity.runtime === 'browser'
              ? 'browser'
              : 'neutral'

    return {
        ...(wantsBanner && resolvedMeta
            ? { banner: createBanner(resolvedMeta, moduleName) }
            : {}),
        clean: true,
        dts,
        entry,
        format: formats,
        minify,
        outDir: plan.outputDir,
        platform,
        sourcemap,
    }
}

function inferPackageMeta(plan: BuildPlan): BannerPackageMeta | undefined {
    const candidate = path.resolve(plan.sourceDir, '../package.json')
    if (!existsSync(candidate)) return undefined

    try {
        const raw: unknown = JSON.parse(readFileSync(candidate, 'utf8'))
        const result = schemaPackageMetaBanner.safeParse(raw)
        return result.success ? result.data : undefined
    } catch {
        return undefined
    }
}
export default toTsdownConfig
