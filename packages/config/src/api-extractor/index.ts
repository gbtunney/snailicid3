import {
    type ApiExtractorConfig,
    type ApiExtractorConfigFunctionOptions,
    buildFunctionApiExtractor,
    defineApiExtractorConfig,
} from './api-functions.js'
import { getBaseConfig } from './base.js'
import {
    type ConfigTool,
    type ConfigToolApi,
    defineConfigTool,
    type IdentityDefineConfig,
} from '../core/index.js'

export const ApiExtractor = defineConfigTool({
    config: buildFunctionApiExtractor,
    defineConfig: defineApiExtractorConfig,
    rules: { base: getBaseConfig },
} satisfies ConfigToolApi<
    ApiExtractorConfig,
    ApiExtractorConfigFunctionOptions,
    IdentityDefineConfig<ApiExtractorConfig>,
    {
        rules: { base: typeof getBaseConfig }
    }
>)

export type ApiExtractorTool = ConfigTool<
    ApiExtractorConfig,
    ApiExtractorConfigFunctionOptions,
    typeof ApiExtractor.defineConfig,
    Omit<typeof ApiExtractor, 'config' | 'defineConfig'>
>

export type {
    ApiExtractorConfig,
    ApiExtractorConfigFunctionOptions,
} from './api-functions.js'
