// @snailicid3/config
// TODO: implement

/**
 * @namespace Commitlint configuration for use in Monorepo.
 * @see [commitlint - Lint commit messages](https://commitlint.js.org/#/)
 * @see [commitlint-config-conventional - Shareable commitlint config](https://www.npmjs.com/package/@commitlint/config-conventional)
 * @see [Commitizen](https://commitizen-tools.github.io/commitizen/)
 */

export { commitlint } from './commitlint/index.js'
export type * from './commitlint/index.js'

/**
 * @namespace Eslint / Tslint Configuration
 * @see [eslint - Find and fix problems in your JavaScript code.](https://eslint.org/)
 * @see [typescript-eslint](https://typescript-eslint.io/getting-started/)
 */
export { EsLint } from './eslint/index.js'
export type * from './eslint/index.js'


/**
 * @namespace Prettier Configuration
 * @see [Prettier - Opinionated Code Formatter](https://prettier.io/)
 */
export { Prettier } from './prettier/index.js'

export type { PrettierConfig, PrettierOptions } from './prettier/index.js'

export { merge } from 'ts-deepmerge'
