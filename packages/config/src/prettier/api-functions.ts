import { getDefaultOptions, getDefaultOverrides } from './options.js'
import type {
    PrettierConfig,
    PrettierOptions,
    PrettierOverrides,
} from './options.js'
import {
    getPrettierPluginsBundled,
    getPrettierPluginsList,
} from './plugins.js'
import type {
    PrettierPluginPackageName,
    ResolvedPrettierPlugin,
} from './plugins/plugin-registry.js'
import { type ConfigFunctionOptions, defineConfig } from '../core/index.js'

export const BASE_IGNORES = ['**/*.api.md', 'tmp', 'temp'] as const

export type PrettierConfigFunctionOptions = ConfigFunctionOptions<{
    /** Bundle plugin objects directly (default) vs. plugin package-name strings only. */
    isBundled?: boolean
    /** Shallow-merged on top of `Prettier.options.base()` (caller keys win). */
    options?: PrettierOptions
    /** Appended after `Prettier.overrides.base()`. */
    overrides?: PrettierOverrides
    /** Appended after the default plugin array. */
    plugins?: Array<PrettierPlugin>
}>

export type PrettierPlugin = PrettierPluginPackageName | ResolvedPrettierPlugin

export const definePrettierConfig = <const TConfig extends PrettierConfig>(
    config: TConfig,
): TConfig => defineConfig(config)

export const buildFunctionPrettier = ({
    isBundled = true,
    options,
    overrides = [],
    plugins = [],
}: PrettierConfigFunctionOptions = {}): PrettierConfig => {
    const defaultOptions = getDefaultOptions()
    const defaultPlugins = isBundled
        ? getPrettierPluginsBundled()
        : getPrettierPluginsList()

    return {
        ...defaultOptions,
        ...options,
        overrides: [...getDefaultOverrides(), ...overrides],
        plugins: [...defaultPlugins, ...plugins],
    }
}

export { type PrettierConfig } from './options.js'
