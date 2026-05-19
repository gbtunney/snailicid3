/**
 * @namespace Commitlint configuration for use in Monorepo.
 * @see [commitlint - Lint commit messages](https://commitlint.js.org/#/)
 * @see [commitlint-config-conventional - Shareable commitlint config](https://www.npmjs.com/package/@commitlint/config-conventional)
 * @see [Commitizen](https://commitizen-tools.github.io/commitizen/)
 */

export { commitlint } from './commitlint/index.js'
export type * from './commitlint/index.js'
export {
    workspaceScopes,
    workspaceScopesCsv,
} from './commitlint/workspace.scopes.js'
export type { WorkspaceScopesOptions } from './commitlint/workspace.scopes.js'

/**
 * @namespace Eslint / Tslint Configuration
 * @see [eslint - Find and fix problems in your JavaScript code.](https://eslint.org/)
 * @see [typescript-eslint](https://typescript-eslint.io/getting-started/)
 */
export { EsLint } from './eslint/index.js'
// Do not re-export all types to avoid duplicate identifier error
export type { EslintConfig, TsConfig } from './eslint/index.js'

/**
 * @namespace LintStaged Configuration
 * @see [npm Lint Staged](https://www.npmjs.com/package/lint-staged)
 */
export { lintstaged } from './lint-staged/index.js'

export type { LintStagedConfiguration } from './lint-staged/index.js'
/**
 * A Node.js command line interface and style checker / lint tool for Markdown files.
 *
 * @see [igorshubovych/markdownlint-cli:](https://github.com/igorshubovych/markdownlint-cli)
 * @see [davidAnson/markdownlint](https://github.com/DavidAnson/markdownlint)
 */
export { markdownlint } from './markdownlint/index.js'

export type * from './markdownlint/index.js'
/**
 * @namespace Prettier Configuration
 * @see [Prettier - Opinionated Code Formatter](https://prettier.io/)
 */
export { Prettier } from './prettier/index.js'

export type { PrettierConfig, PrettierOptions } from './prettier/index.js'
/* SHARED CONFIGURATIONS */
export {
    JS_FILE_EXTENSIONS,
    JSLIKE_FILE_EXTENSIONS,
    TS_FILE_EXTENSIONS,
} from './shared.js'
export type {
    JSFileExtensions,
    JSLikeFileExtensions,
    TSFileExtensions,
} from './shared.js'
export { PRETTIER_FILE_EXTENSIONS } from './shared.js'
export type { PrettierFileExtensions } from './shared.js'
export { MARKDOWN_FILE_EXTENSIONS } from './shared.js'

export type { MarkdownFileExtensions } from './shared.js'
/* *  UTILITIES *  */
export { expandExtensions } from './utilities/extensions.js'
export {
    exportJSONFile,
    //globFileFilter,
    importJSON,
    isPlainObject,
    prettyPrintJSON,
    safeDeserializeJSON,
    serializeJSON,
} from './utilities/json.js'
export type {
    Json,
    JSONExportConfig,
    JSONExportEntry,
} from './utilities/json.js'
export { getFilePath } from './utilities/path.js'
export { merge } from 'ts-deepmerge'
