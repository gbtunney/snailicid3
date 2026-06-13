/**
 * Eslint / Tslint Configuration
 *
 * @see [eslint - Find and fix problems in your JavaScript code.](https://eslint.org/)
 * @see [typescript-eslint](https://typescript-eslint.io/getting-started/)
 * @see Styleguide: _(rule motivation and reference)_ {@link [TypeScript Style Guide](https://mkosir.github.io/typescript-style-guide/) }
 */
import { type Config, defineConfig } from '@eslint/config-helpers'
import { type ConfigToolApi } from '../core/index.js'
import {
    BASE_FILES,
    buildEslintConfig,
    type EslintConfigOptions,
    resolveEslintFiles,
} from './base.js'

// `@eslint/config-helpers`'s `defineConfig` is variadic (flattens/validates a
// list of flat-config objects), so it doesn't fit the single-argument
// `IdentityDefineConfig<TConfig>` shape from `../core/index.js` — pass it explicitly via `ConfigToolApi`.
export const EsLint = {
    config: buildEslintConfig,
    defineConfig,
    files: {
        base: () => BASE_FILES,
        resolve: resolveEslintFiles,
    },
} satisfies ConfigToolApi<
    Array<Config>,
    EslintConfigOptions,
    typeof defineConfig,
    {
        files: {
            base: () => Array<string>
            resolve: typeof resolveEslintFiles
        }
    }
>

export { type EslintConfigOptions } from './base.js'
export type { Config as EslintConfig } from '@eslint/config-helpers'

export type { Config as TsConfig } from 'typescript-eslint'
