import { getDefaultOptions, getDefaultOverrides } from './options.js'
import type {
    PrettierConfigBase,
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

export type PrettierPlugin = PrettierPluginPackageName | ResolvedPrettierPlugin

/** Runtime Prettier config. Runtime config may use resolved plugin objects. */
export type PrettierConfig = PrettierConfigBase & {
    plugins: Array<PrettierPlugin>
}

/** `.prettierrc.json` config. JSON config must use plugin package names. */
export type PrettierJsonConfig = PrettierConfigBase & {
    plugins: Array<PrettierPluginPackageName>
}

export type PrettierConfigFunctionOptions = ConfigFunctionOptions<{
    /** Backcompat alias for `useResolvedPlugins`; defaults to true. */
    isBundled?: boolean
    /** Shallow-merged on top of `Prettier.options.base()`; caller keys win. */
    options?: PrettierOptions
    /** Appended after `Prettier.overrides.base()`. */
    overrides?: PrettierOverrides
    /** Appended after the default plugin array. */
    plugins?: Array<PrettierPlugin>
    /** Use resolved plugin objects directly vs. plugin package-name strings only. */
    useResolvedPlugins?: boolean
}>

export type PrettierJsonConfigFunctionOptions = ConfigFunctionOptions<{
    /** Shallow-merged on top of `Prettier.options.base()`; caller keys win. */
    options?: PrettierOptions
    /** Appended after `Prettier.overrides.base()`. */
    overrides?: PrettierOverrides
    /** Appended after the default package-name plugin array. */
    plugins?: Array<PrettierPluginPackageName>
}>

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
    const shouldUseResolvedPlugins = useResolvedPlugins ?? isBundled
    const defaultPlugins = shouldUseResolvedPlugins
        ? getDefaultPrettierPlugins()
        : getDefaultPrettierPluginNames()

    return {
        ...getDefaultOptions(),
        ...options,
        overrides: [...getDefaultOverrides(), ...overrides],
        plugins: [...defaultPlugins, ...plugins],
    }
}

/**
 * Builds the JSON-file-safe Prettier config shape used by `.prettierrc.json` artifacts.
 *
 * Runtime Prettier config may contain resolved plugin objects. JSON config files must keep plugin package names.
 */
export const buildPrettierJsonConfig = (
    input: PrettierJsonConfigFunctionOptions = {},
): PrettierJsonConfig => {
    const { options, overrides = [], plugins = [] } = input

    return {
        ...getDefaultOptions(),
        ...options,
        overrides: [...getDefaultOverrides(), ...overrides],
        plugins: [...getDefaultPrettierPluginNames(), ...plugins],
    }
}
