import { type IConfigFile } from '@microsoft/api-extractor'
import { getBaseConfig } from './base.js'
import { type ConfigFunctionOptions, defineConfig } from '../core/index.js'
import { deepMerge } from '../utilities/json.js'
import type { PlainObject } from '../utilities/types.js'

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

export const buildFunctionApiExtractor = (
    options: ApiExtractorConfigFunctionOptions = {},
): ApiExtractorConfig => {
    const { cwd: _cwd, overrides = {} } = options
    const config: ApiExtractorConfig = getBaseConfig()
    const finalConfig = deepMerge(
        'replace',
        config as unknown as PlainObject,
        overrides,
    ) as unknown as ApiExtractorConfig

    return defineApiExtractorConfig(finalConfig)
}
