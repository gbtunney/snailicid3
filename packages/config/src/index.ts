export { EsLint, config, flatEslintConfig } from './eslint/index.js'
export type { EslintConfig, TsConfig } from './eslint/index.js'

export {
    Prettier,
    SHARED_FORMATTING_RULES,
    getScaledWidth,
    prettierConfiguration,
} from './prettier/index.js'
export type { PrettierConfig, PrettierOptions, PrettierOverrides } from './prettier/index.js'

export { COMMIT_TYPES, commitlint, configuration } from './commitlint/index.js'
export type { CommitlintUserConfig } from './commitlint/index.js'

export { markdownLintConfigJson, markdownlint } from './markdownlint/index.js'
export type {
    MarkdownlintAPI,
    MarkdownlintCli2ConfigurationSchema,
    MarkdownlintConfiguration,
    MarkdownlintConfigurationSchema,
    MarkdownlintOpts,
    MarkdownlintProcessedResult,
    MarkdownlintRuleConfiguration,
} from './markdownlint/index.js'

export {
    JSLIKE_FILE_EXTENSIONS,
    JS_FILE_EXTENSIONS,
    TS_FILE_EXTENSIONS,
    getFileExtensionList,
    getFilePath,
    importJSON,
    isPlainObject,
    safeDeserializeJSON,
} from './utilities.js'
export type {
    AllowedExtensions,
    JSFileExtensions,
    JSLikeFileExtensions,
    TSFileExtensions,
} from './utilities.js'
