import {
    buildFunctionEsLint,
    defineEsLintConfig,
    type EsLintConfig,
    type EsLintConfigFunctionOptions,
} from './api-functions.js'
import {
    type ConfigTool,
    type ConfigToolApi,
    defineConfigTool,
} from '../core/index.js'

export const EsLint = defineConfigTool({
    config: buildFunctionEsLint,
    defineConfig: defineEsLintConfig,
} satisfies ConfigToolApi<
    EsLintConfig,
    EsLintConfigFunctionOptions,
    typeof defineEsLintConfig
>)

export type EsLintTool = ConfigTool<
    EsLintConfig,
    EsLintConfigFunctionOptions,
    typeof EsLint.defineConfig,
    Omit<typeof EsLint, 'config' | 'defineConfig'>
>

export type {
    EsLintConfig,
    EsLintConfigFunctionOptions,
} from './api-functions.js'

export type { Config as TsConfig } from 'typescript-eslint'
