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
    // NoExternal: [/.*/],
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
    //Const bundle = entry.bundle
    const config: TsdownBuildConfig = {
        ...(entry.bannerContent ? { banner: entry.bannerContent } : {}),
        ...(hasGlobal ? { globalName: entry.moduleName } : {}),
        // Package validation is forced off, and forced rather than defaulted: tsdown's own defaults for these are
        // already false, but a default is something a future tsdown release or a merged user config can change,
        // while an explicit false is a decision this adapter states. Publint, ATTW and unused-dependency scanning
        // answer "is this package correct?" — Doctor's question, asked of a packed artifact. Running them from a
        // build makes builds fail for reasons the build did not cause, and reports on a source tree that is not
        // what gets published. Building emits artifacts; validating them is a separate, explicit step.
        attw: false,
        clean: false,
        deps: externals,
        dts: hasDts,
        entry: { [entry.fileName]: entry.sourcePath },
        // Not a validation switch but a write switch: tsdown's `exports` feature edits the `exports` field of
        // package.json to point at generated files. The manifest is hand-authored here and is an input to the
        // build, never an output of it, so the build must not rewrite it. This is unrelated to the build plan's
        // own `exports` flag, which only selects entries for the pure `toPackageExportsPlan` helper.
        exports: false,
        format: formats,
        logLevel: entry.logLevel,
        outDir: entry.outputDir,
        platform,
        publint: false,
        // Tsdown's own size report, which is not validation but was the only thing the removed `lint` option
        // controlled. Every build plan in this repository disabled it, so it is forced off here rather than left
        // to tsdown's `true` default: dropping the option must not switch reporting back on for five packages
        // that turned it off for the memory errors in #82.
        report: false,
        unbundle: !entry.bundle,
        unused: false,
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
