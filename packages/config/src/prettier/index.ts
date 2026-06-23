export { getScaledWidth, SHARED_FORMATTING_RULES } from '../shared.js'

import {
    buildFunctionPrettier,
    buildPrettierJsonConfig,
    definePrettierConfig,
    type PrettierConfig,
    type PrettierConfigFunctionOptions,
    type PrettierJsonConfig,
    type PrettierJsonConfigFunctionOptions,
} from './api-functions.js'
import { getDefaultOptions, getDefaultOverrides } from './options.js'
import {
    getDefaultPrettierPluginNames,
    getDefaultPrettierPlugins,
} from './plugins/index.js'
import {
    type ConfigTool,
    type ConfigToolApi,
    defineConfigTool,
    type IdentityDefineConfig,
} from '../core/index.js'

export const Prettier = defineConfigTool({
    config: buildFunctionPrettier,
    configFile: buildPrettierJsonConfig,
    defineConfig: definePrettierConfig,
    options: { base: getDefaultOptions },
    overrides: { base: getDefaultOverrides },
    plugins: {
        default: getDefaultPrettierPlugins,
        packageNames: getDefaultPrettierPluginNames,
    },
} satisfies ConfigToolApi<
    PrettierConfig,
    PrettierConfigFunctionOptions,
    IdentityDefineConfig<PrettierConfig>,
    {
        configFile: (
            input: PrettierJsonConfigFunctionOptions,
        ) => PrettierJsonConfig
        options: { base: typeof getDefaultOptions }
        overrides: { base: typeof getDefaultOverrides }
        plugins: {
            default: typeof getDefaultPrettierPlugins
            packageNames: typeof getDefaultPrettierPluginNames
        }
    }
>)

export type PrettierTool = ConfigTool<
    PrettierConfig,
    PrettierConfigFunctionOptions,
    typeof Prettier.defineConfig,
    Omit<typeof Prettier, 'config' | 'defineConfig'>
>

export type {
    PrettierConfig,
    PrettierConfigFunctionOptions,
    PrettierJsonConfig,
    PrettierJsonConfigFunctionOptions,
    PrettierPlugin,
} from './api-functions.js'

export { BASE_IGNORES } from './api-functions.js'

export type {
    PrettierConfigBase,
    PrettierOptions,
    PrettierOverride,
    PrettierOverrideFilePattern,
    PrettierOverrideFiles,
    PrettierOverrides,
    ReservedPrettierOptionKey,
    StripIndexSignature,
} from './options.js'
export type { PrettierPluginName } from './plugins/index.js'

export {
    definePrettierPluginRegistry,
    resolvePrettierPlugin,
    resolvePrettierPluginRegistry,
} from './plugins/registry.js'

export type {
    PrettierPluginPackageName,
    PrettierPluginRegistry,
    PrettierPluginRegistryEntry,
    ResolvedPrettierPlugin,
} from './plugins/registry.js'
