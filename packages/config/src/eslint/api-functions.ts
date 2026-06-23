import {
    type Config,
    defineConfig as eslintDefineConfig,
} from '@eslint/config-helpers'
import { buildDefaultEslintConfig } from './base.js'
import {
    type ConfigFunctionOptions,
    defineConfigBuilder,
} from '../core/index.js'

export type EsLintConfig = Array<Config>

export type EsLintConfigFunctionOptions = ConfigFunctionOptions<{
    /** Appended to `BASE_IGNORES`. */
    ignores?: Array<string>
    /** Extra flat-config objects appended last. */
    overrides?: Array<Config>
}>

export const defineEsLintConfig = eslintDefineConfig

export const buildFunctionEsLint = defineConfigBuilder<
    EsLintConfig,
    EsLintConfigFunctionOptions
>(({ cwd, ignores = [], overrides = [] }) => {
    return defineEsLintConfig(
        ...buildDefaultEslintConfig({
            cwd,
            globalIgnores: ignores,
        }),
        ...overrides,
    )
})
