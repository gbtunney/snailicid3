import type { JsonObject } from 'type-fest'
import { getBaseConfig } from './base.js'
import { type ConfigFunctionOptions, defineConfig } from '../core/index.js'
import { deepMerge } from '../utilities/json.js'
import type { PlainObject } from '../utilities/types.js'

export type ApiExtractorConfig = JsonObject

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
    const config = getBaseConfig()
    const finalConfig = deepMerge(
        'replace',
        config as PlainObject,
        overrides as PlainObject,
    ) as ApiExtractorConfig

    return defineApiExtractorConfig(finalConfig)
}
