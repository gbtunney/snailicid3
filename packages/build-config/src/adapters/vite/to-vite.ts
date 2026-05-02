/** Translate a {@link BuildPlan} into a Vite InlineConfig for library mode. */

import type { InlineConfig, LibraryFormats } from 'vite'
import path from 'node:path'
import { resolveEntryFilename } from './../../build/plan.js'
import type { BuildPlan, OutputKind } from './../../build/types.js'

/** Map OutputKind to Vite's LibraryFormats. Vite uses 'es' not 'esm'. */
const VITE_FORMAT_MAP: Partial<Record<OutputKind, LibraryFormats>> = {
    cjs: 'cjs',
    esm: 'es',
    iife: 'iife',
    umd: 'umd',
}
// TODO: use this as a test for typedoc pls.
/**
 * Translate a {@link BuildPlan} into a Vite {@link InlineConfig} using library mode.
 *
 * Suitable for browser libraries with assets, CSS, or complex transforms. Pure TypeScript libraries should prefer the
 * tsdown adapter which handles DTS natively.
 *
 * DTS is emitted via `vite-plugin-dts` when any entry has `dts: true`.
 *
 * @param {BuildPlan} plan - The tool-agnostic build plan.
 * @param {string} libraryName - The global variable name for IIFE/UMD builds.
 */

export function toViteConfig(
    /*  The tool-agnostic build plan. */
    plan: BuildPlan,
    /*   The global variable name for IIFE/UMD builds. */
    libraryName: string,
): InlineConfig {
    const firstEntry = plan.entries[0]
    if (!firstEntry) throw new Error('BuildPlan must have at least one entry.')

    const filename = resolveEntryFilename(firstEntry.key)
    const entryFile = firstEntry.input
        ? path.resolve(plan.sourceDir, firstEntry.input)
        : path.resolve(plan.sourceDir, `${filename}.ts`)

    const formats: Array<LibraryFormats> = firstEntry.outputKinds
        .map((k) => VITE_FORMAT_MAP[k])
        .filter((f): f is LibraryFormats => f !== undefined)

    const dts = plan.entries.some((e) => e.dts)
    const sourcemap = plan.entries.every((e) => e.sourcemap !== false)
    const minify = plan.entries.some((e) => e.minify)

    const plugins: InlineConfig['plugins'] = []
    if (dts) {
        // vite-plugin-dts is an optional peer dep — import lazily so the adapter
        // works without it when dts is false.
        plugins.push(
            import('vite-plugin-dts').then((m) =>
                m.default({ rollupTypes: true }),
            ),
        )
    }

    return {
        build: {
            lib: {
                entry: entryFile,
                fileName: (format): string => {
                    if (format === 'es') return `${filename}.js`
                    if (format === 'cjs') return `${filename}.cjs`
                    if (format === 'iife') return `${filename}-iife.js`
                    if (format === 'umd') return `${filename}-umd.js`
                    return `${filename}.${format}.js`
                },
                formats,
                name: libraryName,
            },
            minify: minify ? 'esbuild' : false,
            outDir: plan.outputDir,
            sourcemap,
        },
        plugins,
    }
}
