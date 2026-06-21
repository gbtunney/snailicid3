export { getScaledWidth, SHARED_FORMATTING_RULES } from '../shared.js'

export {
    BASE_IGNORES,
    buildPrettierConfigFunction,
    definePrettierConfig,
    Prettier,
} from './api-functions.js'

export type {
    PrettierConfig,
    PrettierConfigFunctionOptions,
} from './api-functions.js'

export type { PrettierOptions, PrettierOverrides } from './options.js'

export {
    definePrettierPlugins,
    resolvePluginRegistry,
    resolvePrettierPlugin,
} from './plugins/plugin-registry.js'

export type {
    PrettierPluginPackageName,
    ResolvedPrettierPlugin,
} from './plugins/plugin-registry.js'
