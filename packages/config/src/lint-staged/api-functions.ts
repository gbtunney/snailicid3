import { type Configuration } from 'lint-staged'
import {
    filterFileArrByGlob,
    JSLIKE_FILE_EXTENSIONS,
    PRETTIER_FILE_EXTENSIONS,
} from './../shared.js'
import { type ConfigFunctionOptions, defineConfig } from '../core/index.js'

export type LintStagedConfig = Configuration

export type LintStagedConfigFunctionOptions = ConfigFunctionOptions<{
    /** Merged on top of the default lint-staged config. */
    overrides?: LintStagedConfig
}>

export const defineLintStagedConfig = <const TConfig extends LintStagedConfig>(
    config: TConfig,
): TConfig => defineConfig(config)

export const extensionsToGlob = (extensions: ReadonlyArray<string>): string =>
    `*.{${extensions.join(',')}}`

export const quoteArg = (path: string): string =>
    `"${path.replaceAll('"', '\\"')}"`

export const toFileArgs = (
    staged: ReadonlyArray<string> | string,
): Array<string> => (Array.isArray(staged) ? staged : [staged]).map(quoteArg)

export const buildFunctionLintStaged = (
    options: LintStagedConfigFunctionOptions = {},
): LintStagedConfig => {
    const { cwd: _cwd, overrides = {} } = options
    const config: LintStagedConfig = {
        '*.md': (staged: ReadonlyArray<string>) => {
            const filtered = filterFileArrByGlob(staged, ['**/*.api.md'], true)
            const files = toFileArgs(filtered)
            if (files.length === 0) return []
            return [
                `pnpm exec prettier --write ${files.join(' ')}`,
                `pnpm exec markdownlint-cli2 --no-globs --fix ${files.join(' ')} || true`,
            ]
        },

        '.gitignore': 'pnpm exec prettier --write .gitignore',

        '.husky/**/*': (staged: ReadonlyArray<string>) => {
            const files = toFileArgs(staged)
            return `pnpm exec prettier --write ${files.join(' ')}`
        },

        [extensionsToGlob(JSLIKE_FILE_EXTENSIONS)]: (
            staged: ReadonlyArray<string>,
        ) => {
            const files = toFileArgs(staged)
            return [
                `pnpm exec prettier --write ${files.join(' ')}`,
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
    const finalConfig = Object.assign({}, config, overrides)
    return defineLintStagedConfig(finalConfig)
}
