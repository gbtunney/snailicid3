import { type IConfigFile } from '@microsoft/api-extractor'
import { getBaseConfig } from './base.js'
import {
    type ConfigFunctionOptions,
    defineConfig,
    defineConfigBuilder,
} from '../core/index.js'
import { deepMerge } from '../utilities/json.js'

export type ApiExtractorConfig = IConfigFile

export type ApiExtractorConfigFunctionOptions = ConfigFunctionOptions<{
    /** Merged on top of the default API Extractor config. */
    overrides?: ApiExtractorConfig
}>

export const defineApiExtractorConfig = <
    const TConfig extends ApiExtractorConfig,
>(
    config: TConfig,
): TConfig => defineConfig(config)

export const buildFunctionApiExtractor = defineConfigBuilder<
    ApiExtractorConfig,
    ApiExtractorConfigFunctionOptions
>(({ overrides = {} }) => {
    const config: ApiExtractorConfig = getBaseConfig()
    const finalConfig = deepMerge(
        'replace',
        config,
        overrides,
    ) as unknown as ApiExtractorConfig

    return defineApiExtractorConfig(finalConfig)
})
