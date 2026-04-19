/**
 * Translate a {@link BuildPlan} into Rollup configuration objects.
 */

import type { OutputOptions, RollupOptions } from 'rollup'
import path from 'path'
import { getPluginsForPreset, inferPreset } from './plugins.js'
import { createBanner } from '../../build/banner.js'
import type { BannerPackageMeta } from '../../build/banner.js'
import { normaliseExportKey, resolveEntryFilename } from '../../build/plan.js'
import type { BuildPlan, EntrySpec, OutputKind } from '../../build/types.js'

/** Map OutputKind to Rollup's internal format string. */
const OUTPUT_KIND_FORMAT: Record<OutputKind, OutputOptions['format']> = {
    cjs: 'cjs',
    esm: 'es',
    iife: 'iife',
    umd: 'umd',
}

/** Map OutputKind to file extension. */
const OUTPUT_KIND_EXT: Record<OutputKind, string> = {
    cjs: '.cjs',
    esm: '.js',
    iife: '-iife.js',
    umd: '-umd.js',
}

function buildOutputOptions(
    entry: EntrySpec,
    kind: OutputKind,
    outputDir: string,
    libraryName: string,
    banner: string | undefined,
): OutputOptions {
    const filename = resolveEntryFilename(entry.key)
    const ext = OUTPUT_KIND_EXT[kind]
    const file = path.resolve(outputDir, `${filename}${ext}`)

    return {
        exports: 'named',
        file,
        format: OUTPUT_KIND_FORMAT[kind],
        name: libraryName,
        sourcemap: entry.sourcemap ?? true,
        ...(banner ? { banner } : {}),
    }
}

/**
 * Translate a {@link BuildPlan} into an array of {@link RollupOptions}.
 *
 * One `RollupOptions` object is generated per entry. Each object may have
 * multiple outputs (one per `outputKind`).
 *
 * @param plan - The tool-agnostic build plan.
 * @param packageMeta - Package metadata used for banner generation (optional).
 * @param libraryName - The global variable name for IIFE/UMD builds.
 */
export function toRollupConfig(
    plan: BuildPlan,
    libraryName: string,
    packageMeta?: BannerPackageMeta,
): Array<RollupOptions> {
    return plan.entries.map((entry) => {
        const filename = resolveEntryFilename(entry.key)
        const inputFile = entry.input
            ? path.resolve(plan.sourceDir, entry.input)
            : path.resolve(plan.sourceDir, `${filename}.ts`)

        const banner =
            entry.banner && packageMeta ? createBanner(libraryName, packageMeta) : undefined

        const preset = inferPreset(entry.outputKinds, plan.identity.runtime)
        const plugins = getPluginsForPreset(preset, {
            minify: entry.minify,
        })

        const output: Array<OutputOptions> = entry.outputKinds.map((kind) =>
            buildOutputOptions(entry, kind, plan.outputDir, libraryName, banner),
        )

        if (entry.minify) {
            // Add minified variants alongside non-minified outputs
            const minOutputs: Array<OutputOptions> = entry.outputKinds.map((kind) => {
                const base = buildOutputOptions(entry, kind, plan.outputDir, libraryName, banner)
                const file = base.file as string
                const minFile = file.replace(/(\.[a-z]{2,7})$/, '.min$1')
                return { ...base, file: minFile, plugins: [], sourcemap: false }
            })
            output.push(...minOutputs)
        }

        return {
            input: inputFile,
            output,
            plugins,
        }
    })
}

/**
 * Generate a `package.json` `exports` field from a {@link BuildPlan}.
 *
 * Returns a plain object suitable for writing into `package.json#exports`.
 */
export function toPackageExports(plan: BuildPlan): Record<string, Record<string, string>> {
    const result: Record<string, Record<string, string>> = {}

    for (const entry of plan.entries) {
        const exportKey = normaliseExportKey(entry.key)
        const filename = resolveEntryFilename(entry.key)
        const conditions: Record<string, string> = {}

        for (const kind of entry.outputKinds) {
            const ext = OUTPUT_KIND_EXT[kind]
            const file = `./${path.join(path.relative('.', plan.outputDir), `${filename}${ext}`)}`
            conditions[kind === 'esm' ? 'import' : kind === 'cjs' ? 'require' : kind] = file
        }

        result[exportKey] = conditions
    }

    return result
}
