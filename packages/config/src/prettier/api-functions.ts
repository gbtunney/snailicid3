import { getDefaultOptions, getDefaultOverrides } from './options.js'
import type {
    PrettierConfig,
    PrettierOptions,
    PrettierOverrides,
} from './options.js'
import {
    getDefaultPrettierPluginNames,
    getDefaultPrettierPlugins,
} from './plugins/index.js'
import type {
    PrettierPluginPackageName,
    ResolvedPrettierPlugin,
} from './plugins/registry.js'
import { type ConfigFunctionOptions, defineConfig } from '../core/index.js'

export const BASE_IGNORES = ['**/*.api.md', 'tmp', 'temp'] as const

export type PrettierConfigFunctionOptions = ConfigFunctionOptions<{
    /** Use `useResolvedPlugins` for clearer option naming. */
    isBundled?: boolean
    /** Shallow-merged on top of `Prettier.options.base()` (caller keys win). */
    options?: PrettierOptions
    /** Appended after `Prettier.overrides.base()`. */
    overrides?: PrettierOverrides
    /** Appended after the default plugin array. */
    plugins?: Array<PrettierPlugin>
    /** Use resolved plugin objects directly (default) vs. plugin package-name strings only. */
    useResolvedPlugins?: boolean
}>

export type PrettierPlugin = PrettierPluginPackageName | ResolvedPrettierPlugin

export const definePrettierConfig = <const TConfig extends PrettierConfig>(
    config: TConfig,
): TConfig => defineConfig(config)

export const buildFunctionPrettier = (
    input: PrettierConfigFunctionOptions = {},
): PrettierConfig => {
    const {
        isBundled = true,
        options,
        overrides = [],
        plugins = [],
        useResolvedPlugins,
    } = input
    const defaultOptions = getDefaultOptions()
    const shouldUseResolvedPlugins = useResolvedPlugins ?? isBundled
    const defaultPlugins = shouldUseResolvedPlugins
        ? getDefaultPrettierPlugins()
        : getDefaultPrettierPluginNames()

    return {
        ...defaultOptions,
        ...options,
        overrides: [...getDefaultOverrides(), ...overrides],
        plugins: [...defaultPlugins, ...plugins],
    }
}

export { type PrettierConfig } from './options.js'
