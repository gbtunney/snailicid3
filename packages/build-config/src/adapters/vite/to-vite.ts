import type { UserConfig } from 'vite'
import type {
    ResolvedBuildPlan,
    ResolvedBuildPlanEntry,
} from '../../build/plan.js'
import { getPlanEntry } from '../../build/ports.js'

export type ViteConfigInput = Array<UserConfig>

type ViteLibraryFormat = 'es' | 'iife' | 'umd'

const VITE_FORMATS = ['es', 'iife', 'umd'] as const

export function entryToViteConfig(
    entry: ResolvedBuildPlanEntry,
    plan: ResolvedBuildPlan,
): UserConfig {
    if (entry.runtime === 'node') {
        throw new Error(
            `Vite adapter only supports browser and universal entries. Received node entry "${entry.key}" in ${plan.packageName}.`,
        )
    }

    const formats = entry.output_formats
        .map(toViteFormat)
        .filter((format): format is ViteLibraryFormat => format !== null)

    return {
        build: {
            emptyOutDir: false,
            lib: {
                entry: entry.sourcePath,
                fileName: entry.fileName,
                formats,
                name: entry.moduleName,
            },
            outDir: entry.outputDir,
            sourcemap: true,
        },
        logLevel: entry.logLevel,
    }
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
    return plan.entries
        .filter((entry) => entry.runtime !== 'node')
        .map((entry) => entryToViteConfig(entry, plan))
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
