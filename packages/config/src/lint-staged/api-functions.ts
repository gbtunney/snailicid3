import { type Configuration } from 'lint-staged'

import { getLintStagedDefaultConfig } from './base.js'
import { type ConfigFunctionOptions, defineConfig } from '../core/index.js'

export type LintStagedConfig = Configuration

export type LintStagedConfigFunctionOptions = ConfigFunctionOptions<{
    /** Merged on top of the default lint-staged config. */
    overrides?: LintStagedConfig
}>

export const defineLintStagedConfig = <const TConfig extends LintStagedConfig>(
    config: TConfig,
): TConfig => defineConfig(config)

export const buildFunctionLintStaged = (
    /** Merged on top of the default lint-staged config. */

    options: LintStagedConfigFunctionOptions = {},
): LintStagedConfig => {
    const { cwd: _cwd, overrides = {} } = options
    const config: LintStagedConfig = getLintStagedDefaultConfig()
    const finalConfig = Object.assign({}, config, overrides)
    return defineLintStagedConfig(finalConfig)
}
