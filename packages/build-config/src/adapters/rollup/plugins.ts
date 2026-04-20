/**
 * Rollup plugin presets.
 *
 * Plugin selection belongs in the adapter layer, not in BuildPlan. Use these named presets instead of building plugin
 * arrays by hand in every config.
 */

import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import type { Plugin } from 'rollup'
import nodeExternals from 'rollup-plugin-node-externals'
import nodePolyfills from 'rollup-plugin-polyfill-node'

export type RollupPluginPreset =
    | 'node_library'
    | 'browser_library'
    | 'cli'
    | 'iife'
/**
 * TypeScript plugin config shared across all presets.
 *
 * Uses tsconfig: false (deliberate) to keep rollup's transpilation completely separate from tsc's type-checking +
 * declaration emit. Rollup only produces JS → dist/. Declarations come from `tsc -p src/tsconfig.json` → types/.
 *
 * Previously this was a workaround for TS6304 (composite + declaration: false). composite is now removed from
 * tsconfig-base.json, so this is now a clean separation of concerns rather than a workaround.
 */
const tsPlugin = (): Plugin =>
    // TODO how can we use the normal config?
    typescript({
        declaration: false,
        declarationMap: false,
        esModuleInterop: true,
        module: 'ESNext',
        moduleResolution: 'bundler',
        sourceMap: true,
        strict: true,
        target: 'ESNext',
        tsconfig: false,
    })
/**
 * Return a plugin array for the given preset.
 *
 * @example
 *     ;```ts
 *     const plugins = getPluginsForPreset('node_library')
 *     ```
 */
export function getPluginsForPreset(
    preset: RollupPluginPreset,
    options: { minify?: boolean } = {},
): Array<Plugin> {
    switch (preset) {
        case 'node_library':
            return [
                tsPlugin(),
                nodeExternals(),
                nodeResolve({ preferBuiltins: true }),
                commonjs({ requireReturnsDefault: 'auto' }),
                json(),
            ]

        case 'browser_library':
            return [
                tsPlugin(),
                nodePolyfills(),
                nodeResolve({ browser: true }),
                commonjs({ requireReturnsDefault: 'auto' }),
                json(),
            ]

        case 'cli':
            return [
                tsPlugin(),
                nodeExternals(),
                nodeResolve({ preferBuiltins: true }),
                commonjs({ requireReturnsDefault: 'auto' }),
            ]

        case 'iife':
            return [
                tsPlugin(),
                nodeResolve({ browser: true }),
                commonjs({ requireReturnsDefault: 'auto' }),
                json(),
                ...(options.minify ? [terser()] : []),
            ]
    }
}

/** Infer a sensible preset from an entry's output kinds and the package runtime. */
export function inferPreset(
    outputKinds: Array<string>,
    runtime: string,
): RollupPluginPreset {
    if (outputKinds.includes('iife')) return 'iife'
    if (runtime === 'browser') return 'browser_library'
    if (outputKinds.includes('cjs') || outputKinds.includes('esm')) {
        return runtime === 'node' ? 'cli' : 'node_library'
    }
    return 'node_library'
}

/**
 * TODO add dts somewhere import { dts } from "rollup-plugin-dts";
 *
 * Const config = [ // … { input: "./my-input/index.d.ts", output: [{ file: "dist/my-library.d.ts", format: "es" }],
 * plugins: [dts()], }, ];
 */
