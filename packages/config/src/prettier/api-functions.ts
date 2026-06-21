import { getDefaultOptions, getDefaultOverrides } from './options.js'
import type {
    PrettierConfig,
    PrettierOptions,
    PrettierOverrides,
} from './options.js'
import {
    getBuiltInPrettierPlugins,
    getPrettierPluginsBundled,
    getPrettierPluginsList,
} from './plugins.js'
import type {
    PrettierPluginPackageName,
    ResolvedPrettierPlugin,
} from './plugins/plugin-registry.js'
import {
    type ConfigFunctionOptions,
    type ConfigToolApi,
    defineConfig,
    type IdentityDefineConfig,
} from '../core/index.js'

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

type PrettierPlugin = PrettierPluginPackageName | ResolvedPrettierPlugin

export const definePrettierConfig = <const TConfig extends PrettierConfig>(
    config: TConfig,
): TConfig => defineConfig(config)

export const buildPrettierConfigFunction = ({
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

export const Prettier = {
    config: buildPrettierConfigFunction,
    defineConfig: definePrettierConfig,
    options: { base: getDefaultOptions },
    overrides: { base: getDefaultOverrides },
    plugins: {
        builtIn: getBuiltInPrettierPlugins,
        bundled: getPrettierPluginsBundled,
        list: getPrettierPluginsList,
    },
} satisfies ConfigToolApi<
    PrettierConfig,
    PrettierConfigFunctionOptions,
    IdentityDefineConfig<PrettierConfig>,
    {
        options: { base: typeof getDefaultOptions }
        overrides: { base: typeof getDefaultOverrides }
        plugins: {
            builtIn: typeof getBuiltInPrettierPlugins
            bundled: typeof getPrettierPluginsBundled
            list: typeof getPrettierPluginsList
        }
    }
>

export { type PrettierConfig } from './options.js'
