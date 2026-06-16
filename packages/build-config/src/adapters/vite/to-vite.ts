import { build } from 'vite'
import type { PluginOption, UserConfig } from 'vite'
import dts from 'vite-plugin-dts'
import type {
    ResolvedBuildPlan,
    ResolvedBuildPlanEntry,
} from '../../build/plan.js'
import type { BuildAdapter } from '../../build/ports.js'
import { getPlanEntry } from '../../build/ports.js'

export type ViteConfigInput = Array<UserConfig>

type ViteLibraryFormat = 'cjs' | 'es' | 'iife' | 'umd'

const VITE_FORMATS = ['cjs', 'es', 'iife', 'umd'] as const

export function entryToViteConfig(
    entry: ResolvedBuildPlanEntry,
    plan: ResolvedBuildPlan,
): UserConfig {
    if (entry.runtime === 'node') {
        throw new Error(
            `Vite adapter only supports browser and universal entries. Received node entry "${entry.key}" in ${plan.packageName}.`,
        )
    }

    if (entry.product === 'web_app') {
        return entryToViteAppConfig(entry)
    }

    return entryToViteLibraryConfig(entry)
}

export function toViteConfig(
    plan: ResolvedBuildPlan,
    entryKey = '*',
): UserConfig {
    const entry = getPlanEntry(plan, entryKey)

    if (!entry) {
        throw new Error(
            `Build plan entry not found for key "${entryKey}" in ${plan.packageName}.`,
        )
    }

    return entryToViteConfig(entry, plan)
}

export function toViteConfigs(plan: ResolvedBuildPlan): ViteConfigInput {
    if (plan.root.product === 'web_app') {
        return [toViteConfig(plan)]
    }

    return plan.entries
        .filter((entry) => entry.runtime !== 'node')
        .map((entry) => entryToViteConfig(entry, plan))
}

function entryToViteAppConfig(entry: ResolvedBuildPlanEntry): UserConfig {
    return {
        build: {
            emptyOutDir: true,
            outDir: entry.outputDir,
            sourcemap: true,
        },
        logLevel: entry.logLevel,
    }
}

function entryToViteLibraryConfig(entry: ResolvedBuildPlanEntry): UserConfig {
    const formats = entry.output_formats
        .map(toViteFormat)
        .filter((format): format is ViteLibraryFormat => format !== null)
    const plugins = createVitePlugins(entry)

    return {
        build: {
            emptyOutDir: false,
            lib: {
                entry: entry.sourcePath,
                fileName: (format) => toViteLibraryFileName(entry, format),
                formats,
                name: entry.moduleName,
            },
            outDir: entry.outputDir,
            sourcemap: true,
        },
        logLevel: entry.logLevel,
        plugins,
    }
}

export const viteAdapter: BuildAdapter = {
    async build(plan: ResolvedBuildPlan): Promise<void> {
        for (const config of toViteConfigs(plan)) {
            await build(config)
        }
    },

    createConfig(plan: ResolvedBuildPlan): ViteConfigInput {
        return toViteConfigs(plan)
    },

    name: 'vite',
}

function createVitePlugins(entry: ResolvedBuildPlanEntry): Array<PluginOption> {
    if (!entry.output_formats.includes('ts')) {
        return []
    }

    return [
        dts({
            entryRoot: entry.sourceDir,
            insertTypesEntry: true,
            outDirs: [entry.outputDir],
        }),
    ]
}

function toViteFormat(format: string): null | ViteLibraryFormat {
    if (format === 'esm') {
        return 'es'
    }

    if ((VITE_FORMATS as ReadonlyArray<string>).includes(format)) {
        return format as ViteLibraryFormat
    }

    return null
}

function toViteLibraryFileName(
    entry: ResolvedBuildPlanEntry,
    format: string,
): string {
    if (format === 'es') return `${entry.fileName}.js`
    if (format === 'cjs') return `${entry.fileName}.cjs`
    if (format === 'iife') return `${entry.fileName}-iife.js`
    if (format === 'umd') return `${entry.fileName}-umd.js`
    return `${entry.fileName}.${format}.js`
}
