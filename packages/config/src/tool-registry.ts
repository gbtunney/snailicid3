import type {
    CommitlintConfig,
    CommitlintConfigFunctionOptions,
} from './commitlint/index.js'
import { Commitlint } from './commitlint/index.js'
import type { AnyDefineConfig, ConfigToolApi } from './core/index.js'
import type {
    EsLintConfig,
    EsLintConfigFunctionOptions,
} from './eslint/index.js'
import { EsLint } from './eslint/index.js'
import type {
    LintStagedConfig,
    LintStagedConfigFunctionOptions,
} from './lint-staged/index.js'
import { LintStaged } from './lint-staged/index.js'
import type {
    MarkdownlintConfig,
    MarkdownlintConfigFunctionOptions,
} from './markdownlint/index.js'
import { Markdownlint } from './markdownlint/index.js'
import type {
    PrettierConfig,
    PrettierConfigFunctionOptions,
} from './prettier/index.js'
import { Prettier } from './prettier/index.js'

type AnyConfigToolApi = ConfigToolApi<object, object, AnyDefineConfig>

export const configTools = {
    commitlint: Commitlint,
    eslint: EsLint,
    lintStaged: LintStaged,
    markdownlint: Markdownlint,
    prettier: Prettier,
} satisfies Record<string, AnyConfigToolApi>

export type ConfigToolRegistry = {
    commitlint: ConfigToolRegistryEntry<
        CommitlintConfig,
        CommitlintConfigFunctionOptions
    >
    eslint: ConfigToolRegistryEntry<EsLintConfig, EsLintConfigFunctionOptions>
    lintStaged: ConfigToolRegistryEntry<
        LintStagedConfig,
        LintStagedConfigFunctionOptions
    >
    markdownlint: ConfigToolRegistryEntry<
        MarkdownlintConfig,
        MarkdownlintConfigFunctionOptions
    >
    prettier: ConfigToolRegistryEntry<
        PrettierConfig,
        PrettierConfigFunctionOptions
    >
}

export type ConfigToolRegistryEntry<TConfig, TFunctionOptions> = {
    config: TConfig
    functionOptions: TFunctionOptions
}
