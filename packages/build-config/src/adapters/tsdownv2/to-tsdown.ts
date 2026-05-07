import type { build } from 'tsdown'
import type { ResolvedBuildPlan, ResolvedBuildPlanEntry } from '../../build/plan2.js'

type TsdownBuildConfig = NonNullable<Parameters<typeof build>[0]>

/** Module-family formats — can share a single tsdown call, 'ts' maps to dts:true */
const MODULE_FORMATS = ['esm', 'cjs'] as const
/** Global-family formats — need globalName, typically one per entry */
const GLOBAL_FORMATS = ['iife', 'umd'] as const

type ModuleFormat = (typeof MODULE_FORMATS)[number]
type GlobalFormat = (typeof GLOBAL_FORMATS)[number]
type TsdownFormat = ModuleFormat | GlobalFormat

function isModuleFormat(f: string): f is ModuleFormat {
    return (MODULE_FORMATS as ReadonlyArray<string>).includes(f)
}

function isGlobalFormat(f: string): f is GlobalFormat {
    return (GLOBAL_FORMATS as ReadonlyArray<string>).includes(f)
}

/** Derives the tsdown platform value from a runtime kind. */
function runtimeToPlatform(
    runtime: ResolvedBuildPlan['root']['runtime'],
): 'browser' | 'neutral' | 'node' {
    if (runtime === 'node') return 'node'
    if (runtime === 'browser') return 'browser'
    return 'neutral'
}

/**
 * Translate a single {@link ResolvedBuildPlanEntry} into a tsdown build config.
 *
 * - `'ts'` in `output_formats` is stripped from the format list and sets `dts: true`
 * - Global formats (`iife`, `umd`) set `globalName` from `entry.moduleName`
 * - `bannerContent` (pre-rendered string) is passed through directly
 */
export function entryToTsdownConfig(
    entry: ResolvedBuildPlanEntry,
    plan: ResolvedBuildPlan,
): TsdownBuildConfig {
    const hasDts = entry.output_formats.includes('ts')
    const formats = entry.output_formats.filter(
        (f): f is TsdownFormat => isModuleFormat(f) || isGlobalFormat(f),
    )
    const hasGlobal = formats.some(isGlobalFormat)
    const platform = runtimeToPlatform(plan.root.runtime)

    return {
        ...(entry.bannerContent ? { banner: entry.bannerContent } : {}),
        ...(hasGlobal ? { globalName: entry.moduleName } : {}),
        clean: true,
        dts: hasDts,
        entry: { [entry.fileName]: entry.sourcePath },
        format: formats,
        outDir: entry.outputDir,
        platform,
    }
}

/**
 * Translate a {@link ResolvedBuildPlan} into an array of tsdown build configs,
 * one per entry.
 */
export function toTsdownConfigs(
    plan: ResolvedBuildPlan,
): Array<TsdownBuildConfig> {
    return plan.entries.map((entry) => entryToTsdownConfig(entry, plan))
}
