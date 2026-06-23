import {
    type Config,
    defineConfig as eslintDefineConfig,
} from '@eslint/config-helpers'
import { buildDefaultEslintConfig } from './base.js'
import { type ConfigFunctionOptions } from '../core/index.js'
import { resolveCwd } from '../utilities/path.js'

export type EsLintConfig = Array<Config>

export type EsLintConfigFunctionOptions = ConfigFunctionOptions<{
    /** Appended to `BASE_IGNORES`. */
    ignores?: Array<string>
    /** Extra flat-config objects appended last. */
    overrides?: Array<Config>
}>

export const defineEsLintConfig = eslintDefineConfig

export const buildFunctionEsLint = ({
    cwd,
    ignores = [],
    overrides = [],
}: EsLintConfigFunctionOptions = {}): EsLintConfig => {
    return defineEsLintConfig(
        ...buildDefaultEslintConfig({
            cwd: resolveCwd(cwd),
            globalIgnores: ignores,
        }),
        ...overrides,
    )
}
