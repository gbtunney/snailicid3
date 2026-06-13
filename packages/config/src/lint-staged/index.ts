import { type Configuration } from 'lint-staged'

/// the above didnt error even tho it was not listed as a dependency - figure out why??
export type LintStagedConfiguration = Configuration
import { type ConfigToolApi, type IdentityDefineConfig } from '../core/index.js'
import {
    filterFileArrByGlob,
    JSLIKE_FILE_EXTENSIONS,
    PRETTIER_FILE_EXTENSIONS,
} from './../shared.js'

/** Identity `defineConfig` helper for lint-staged config files. */
export const defineLintStagedConfig = <const Type extends LintStagedConfiguration>(
    config: Type,
): Type => config

export const extensionsToGlob = (extensions: ReadonlyArray<string>): string =>
    `*.{${extensions.join(',')}}`

export const quoteArg = (_path: string): string =>
    `"${_path.replaceAll('"', '\\"')}"`
export const toFileArgs = (
    staged: ReadonlyArray<string> | string,
): Array<string> => (Array.isArray(staged) ? staged : [staged]).map(quoteArg)

/**
 * @example
 *     ```ts
 *     const test = {
 *     '.husky': (staged: ReadonlyArray<string>): string => {
 *     const files: string[] = lintstaged.toFileArgs(staged)
 *     return `pnpm exec prettier --write ${files.join(' ')}`
 *     },
 *     hello: 'hi',
 *     } satisfies LintStagedConfiguration
 *
 *     export default lintstaged.config(test)
 *     ```
 */

export const lintStagedConfig = (
    merged?: LintStagedConfiguration,
): LintStagedConfiguration => {
    const config: LintStagedConfiguration = {
        '.gitignore': 'pnpm exec prettier --write .gitignore',

        '.husky/**/*': (staged: ReadonlyArray<string>) => {
            const files = toFileArgs(staged)
            return `pnpm exec prettier --write ${files.join(' ')}`
        },

        [`*.md`]: (staged: ReadonlyArray<string>) => {
            const filtered = filterFileArrByGlob(staged, ['**/*.api.md'], true)
            const files = toFileArgs(filtered)
            if (files.length === 0) return []
            return [
                `pnpm exec prettier --write ${files.join(' ')}`,
                `pnpm exec markdownlint-cli2 --no-globs --fix ${files.join(' ')}  || true`,
            ]
        },

        [extensionsToGlob(JSLIKE_FILE_EXTENSIONS)]: (
            staged: ReadonlyArray<string>,
        ) => {
            const files = toFileArgs(staged)
            return [
                `pnpm exec prettier --write ${files.join(' ')} `,
                `pnpm exec eslint --fix ${files.join(' ')}`,
            ]
        },

        [extensionsToGlob(PRETTIER_FILE_EXTENSIONS)]: (
            staged: ReadonlyArray<string>,
        ) => {
            const filtered = filterFileArrByGlob(staged, ['**/*.api.md'], true)
            const files = toFileArgs(filtered)
            if (files.length === 0) return []
            return `pnpm exec prettier --write ${files.join(' ')}`
        },
    }
    const result: LintStagedConfiguration =
        merged !== undefined ? Object.assign(config, merged) : config
    return defineLintStagedConfig(config)
}
export const lintstaged = {
    config: lintStagedConfig,
    defineConfig: defineLintStagedConfig,
    extensionsToGlob,
    filterFileArrByGlob,
    quoteArg,
    toFileArgs,
} satisfies ConfigToolApi<
    LintStagedConfiguration,
    LintStagedConfiguration,
    IdentityDefineConfig<LintStagedConfiguration>,
    {
        extensionsToGlob: typeof extensionsToGlob
        filterFileArrByGlob: typeof filterFileArrByGlob
        quoteArg: typeof quoteArg
        toFileArgs: typeof toFileArgs
    }
>
