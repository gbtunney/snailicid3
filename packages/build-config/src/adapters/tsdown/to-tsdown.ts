import type { build } from 'tsdown'
import type {
    ResolvedBuildPlan,
    ResolvedBuildPlanEntry,
} from '../../build/plan.js'
import { getPlanEntry } from '../../build/ports.js'

export type TsdownConfigInput = Array<TsdownBuildConfig>
type TsdownBuildConfig = NonNullable<Parameters<typeof build>[0]>

/** Module-family formats — can share a single tsdown call, 'ts' maps to dts:true */
const MODULE_FORMATS = ['esm', 'cjs'] as const
/** Global-family formats — need globalName, typically one per entry */
const GLOBAL_FORMATS = ['iife', 'umd'] as const

type GlobalFormat = (typeof GLOBAL_FORMATS)[number]
type ModuleFormat = (typeof MODULE_FORMATS)[number]
type TsdownFormat = GlobalFormat | ModuleFormat

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
    logTsdownAdapter('entryToTsdownConfig:start', {
        entryKey: entry.key,
        entryOutputFormats: entry.output_formats,
        runtime: entry.runtime,
    })
    // noExternal: [/.*/],
    const hasDts = entry.output_formats.includes('ts')

    const externals =
        entry.include_dependencies === false
            ? {}
            : entry.include_dependencies === true
              ? {
                    alwaysBundle: [/.*/],
                }
              : {
                    alwaysBundle: entry.include_dependencies,
                }

    const formats = entry.output_formats.filter(
        (format): format is TsdownFormat =>
            isModuleFormat(format) || isGlobalFormat(format),
    )

    const hasGlobal = formats.some(isGlobalFormat)
    const platform = runtimeToPlatform(entry.runtime)

    const target = transpileToTarget(entry.transpile)

    const lintSettings: Partial<TsdownBuildConfig> = entry.lint
        ? {
              attw: {
                  level: 'error',
                  profile: 'node16',
              },
              publint: true,
              report: true,
              unused: {
                  level: 'warning', //this should be setup on publish or ci to do it for real
              },
          }
        : {}
    logTsdownAdapter('entryToTsdownConfig:derived', {
        deps: externals,
        entryKey: entry.key,
        hasDts,
        hasGlobal,
        platform,
        target,
        transpile: entry.transpile,
        tsdownFormats: formats,
        unbundle: !entry.bundle,
    })
    //const bundle = entry.bundle
    const config: TsdownBuildConfig = {
        ...(entry.bannerContent ? { banner: entry.bannerContent } : {}),
        ...(hasGlobal ? { globalName: entry.moduleName } : {}),
        clean: false,
        deps: externals,
        dts: hasDts,
        entry: { [entry.fileName]: entry.sourcePath },
        exports: true,
        format: formats,
        logLevel: entry.logLevel,
        outDir: entry.outputDir,
        platform,
        report: true,
        unbundle: !entry.bundle,
        ...lintSettings,
        ...(target ? { target } : {}),
    }

    logTsdownAdapter('entryToTsdownConfig:result', {
        config,
        entryKey: entry.key,
    })

    return config
}

/** Translate one entry from a {@link ResolvedBuildPlan} into a tsdown build config. */
export function toTsdownConfig(
    plan: ResolvedBuildPlan,
    entryKey = '*',
): TsdownBuildConfig {
    const entry = getPlanEntry(plan, entryKey)

    if (!entry) {
        throw new Error(
            `Build plan entry not found for key "${entryKey}" in ${plan.packageName}.`,
        )
    }

    return entryToTsdownConfig(entry, plan)
}

/** Translate a {@link ResolvedBuildPlan} into an array of tsdown build configs, one per entry. */
export function toTsdownConfigs(plan: ResolvedBuildPlan): TsdownConfigInput {
    logTsdownAdapter('toTsdownConfigs:start', {
        entryCount: plan.entries.length,
        packageName: plan.packageName,
        runtime: plan.root.runtime,
    })

    const configs = plan.entries.map((entry) =>
        entryToTsdownConfig(entry, plan),
    )

    logTsdownAdapter('toTsdownConfigs:result', {
        configCount: configs.length,
    })

    return configs
}

function isGlobalFormat(format: string): format is GlobalFormat {
    return (GLOBAL_FORMATS as ReadonlyArray<string>).includes(format)
}

function isModuleFormat(format: string): format is ModuleFormat {
    return (MODULE_FORMATS as ReadonlyArray<string>).includes(format)
}

/** Emit adapter debug logs when TSDOWN_ADAPTER_DEBUG is enabled. */
function logTsdownAdapter(
    message: string,
    context?: Readonly<Record<string, unknown>>,
): void {
    if (process.env.TSDOWN_ADAPTER_DEBUG !== '1') {
        return
    }

    if (context) {
        console.log(`[tsdownv2-adapter] ${message}`, context)
        return
    }

    console.log(`[tsdownv2-adapter] ${message}`)
}

/** Derives the tsdown platform value from a runtime kind. */
function runtimeToPlatform(
    runtime: ResolvedBuildPlan['root']['runtime'],
): 'browser' | 'neutral' | 'node' {
    if (runtime === 'node') return 'node'
    if (runtime === 'browser') return 'browser'
    return 'neutral'
}

/** Map build-plan transpile values to tsdown target behavior. */
function transpileToTarget(
    transpile: ResolvedBuildPlanEntry['transpile'],
): Array<string> | string | undefined {
    if (transpile === true) return undefined
    if (transpile === false || transpile === 'none') return 'esnext'
    if (transpile.length === 0) return undefined
    return transpile
}
