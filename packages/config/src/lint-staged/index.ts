import { filterFileArrByGlob } from './../shared.js'
import {
    buildFunctionLintStaged,
    defineLintStagedConfig,
    extensionsToGlob,
    type LintStagedConfig,
    type LintStagedConfigFunctionOptions,
    quoteArg,
    toFileArgs,
} from './api-functions.js'
import {
    type ConfigTool,
    type ConfigToolApi,
    defineConfigTool,
    type IdentityDefineConfig,
} from '../core/index.js'

export const LintStaged = defineConfigTool({
    config: buildFunctionLintStaged,
    defineConfig: defineLintStagedConfig,
    extensionsToGlob,
    filterFileArrByGlob,
    quoteArg,
    toFileArgs,
} satisfies ConfigToolApi<
    LintStagedConfig,
    LintStagedConfigFunctionOptions,
    IdentityDefineConfig<LintStagedConfig>,
    {
        extensionsToGlob: typeof extensionsToGlob
        filterFileArrByGlob: typeof filterFileArrByGlob
        quoteArg: typeof quoteArg
        toFileArgs: typeof toFileArgs
    }
>)

export type LintStagedTool = ConfigTool<
    LintStagedConfig,
    LintStagedConfigFunctionOptions,
    typeof LintStaged.defineConfig,
    Omit<typeof LintStaged, 'config' | 'defineConfig'>
>

export type {
    LintStagedConfig,
    LintStagedConfigFunctionOptions,
} from './api-functions.js'
