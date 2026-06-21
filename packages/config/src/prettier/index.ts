export { getScaledWidth, SHARED_FORMATTING_RULES } from '../shared.js'

import {
    buildFunctionPrettier,
    definePrettierConfig,
    type PrettierConfig,
    type PrettierConfigFunctionOptions,
} from './api-functions.js'
import { getDefaultOptions, getDefaultOverrides } from './options.js'
import {
    getBuiltInPrettierPlugins,
    getPrettierPluginsBundled,
    getPrettierPluginsList,
} from './plugins.js'
import {
    type ConfigTool,
    type ConfigToolApi,
    defineConfigTool,
    type IdentityDefineConfig,
} from '../core/index.js'

export const Prettier = defineConfigTool({
    config: buildFunctionPrettier,
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
    PrettierPlugin,
} from './api-functions.js'

export { BASE_IGNORES } from './api-functions.js'

export type { PrettierOptions, PrettierOverrides } from './options.js'
export type { PrettierPluginName } from './plugins.js'

export {
    definePrettierPlugins,
    resolvePluginRegistry,
    resolvePrettierPlugin,
} from './plugins/plugin-registry.js'

export type {
    PrettierPluginPackageName,
    ResolvedPrettierPlugin,
} from './plugins/plugin-registry.js'
