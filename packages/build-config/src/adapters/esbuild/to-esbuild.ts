/** Translate a {@link BuildPlan} into an esbuild BuildOptions object. */

import type { BuildOptions, Format } from 'esbuild'
import path from 'path'
import { resolveEntryFilename } from '../../build/plan.js'
import type { BuildPlan } from '../../build/types.js'

const FORMAT_MAP: Record<string, Format> = {
    cjs: 'cjs',
    esm: 'esm',
    iife: 'iife',
    umd: 'iife', // esbuild has no native UMD; IIFE is the closest
}

/**
 * Translate a {@link BuildPlan} into esbuild {@link BuildOptions}.
 *
 * Designed for Google Apps Script and other single-file bundle targets where everything must be inlined (`bundle:
 * true`, no externals). DTS is not emitted — GAS and similar runtimes do not use TypeScript declarations.
 *
 * Multiple entries produce multiple `outfile` configs; call `build()` once per entry (or use `entryPoints` + `outdir`
 * when all entries share the same format).
 */
export function toEsbuildConfig(plan: BuildPlan): Array<BuildOptions> {
    return plan.entries.map((entry) => {
        const filename = resolveEntryFilename(entry.key)
        const inputFile = entry.input
            ? path.resolve(plan.sourceDir, entry.input)
            : path.resolve(plan.sourceDir, `${filename}.ts`)

        // For script targets, pick the first format (typically iife or esm).
        const kind = entry.outputKinds[0] ?? 'iife'
        const format: Format = FORMAT_MAP[kind] ?? 'iife'

        const ext = kind === 'cjs' ? '.cjs' : '.js'

        return {
            bundle: true,
            entryPoints: [inputFile],
            format,
            minify: entry.minify ?? false,
            outfile: path.resolve(plan.outputDir, `${filename}${ext}`),
            // GAS runs in V8 without Node.js globals
            platform: 'browser',
            sourcemap: false,
            // GAS target: V8 engine, ES2019 is well-supported
            target: 'es2019',
        }
    })
}
