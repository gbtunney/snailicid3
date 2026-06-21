import {
    
    buildFunctionMarkdownlint,
    defineMarkdownlintConfig,
    type MarkdownlintConfig,
    type MarkdownlintConfigFunctionOptions,
} from './api-functions.js'
import { getBaseConfig } from './base.config.js'
import { getMergedRuleConfiguration } from './rules.js'
import {
    type ConfigTool,
    type ConfigToolApi,
    defineConfigTool,
    type IdentityDefineConfig,
} from '../core/index.js'

export const Markdownlint = defineConfigTool({
    config: buildFunctionMarkdownlint,
    defineConfig: defineMarkdownlintConfig,
    rules: {
        base: getBaseConfig,
        merge: getMergedRuleConfiguration,
    },
} satisfies ConfigToolApi<
    MarkdownlintConfig,
    MarkdownlintConfigFunctionOptions,
    IdentityDefineConfig<MarkdownlintConfig>,
    {
        rules: {
            base: typeof getBaseConfig
            merge: typeof getMergedRuleConfiguration
        }
    }
>)

export type MarkdownlintTool = ConfigTool<
    MarkdownlintConfig,
    MarkdownlintConfigFunctionOptions,
    typeof Markdownlint.defineConfig,
    Omit<typeof Markdownlint, 'config' | 'defineConfig'>
>

export type {
    MarkdownlintConfig,
    MarkdownlintConfigFunctionOptions,
} from './api-functions.js'

export {BASE_IGNORES} from './api-functions.js'

export type {
    MarkdownlintConfiguration,
    MarkdownlintRuleConfiguration,
} from './schema.js'