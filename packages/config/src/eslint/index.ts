/**
 * Eslint / Tslint Configuration
 *
 * @see [eslint - Find and fix problems in your JavaScript code.](https://eslint.org/)
 * @see [typescript-eslint](https://typescript-eslint.io/getting-started/)
 * @see Styleguide: _(rule motivation and reference)_ {@link [TypeScript Style Guide](https://mkosir.github.io/typescript-style-guide/) }
 */
import {defineConfig}from '@eslint/config-helpers'
import { flatEslintConfig } from './base.js'

/** @ignore */
export const EsLint: {
    config: typeof flatEslintConfig
    defineConfig: typeof defineConfig
} = {
    config: flatEslintConfig,
    defineConfig
}

export { flatEslintConfig } from './base.js'
export { flatEslintConfig as config } from './base.js'
export type { Config as EslintConfig } from '@eslint/config-helpers'
export type { Config as TsConfig } from 'typescript-eslint'
