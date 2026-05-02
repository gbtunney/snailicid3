import { type Configuration } from 'lint-staged'
import {
    JSLIKE_FILE_EXTENSIONS,
    PRETTIER_FILE_EXTENSIONS,
} from './../shared.js'

const extensionsToGlob = (extensions: ReadonlyArray<string>): string =>
    `*.{${extensions.join(',')}}`

export const quoteArg = (p: string): string => `"${p.replaceAll('"', '\\"')}"`
export const toFileArgs = (staged: ReadonlyArray<string> | string): string =>
    (Array.isArray(staged) ? staged : [staged]).map(quoteArg).join(' ')

export const lintStagedConfig = (): Configuration => {
    const config: Configuration = {
        '.gitignore': 'pnpm exec prettier --write .gitignore',

        '.husky/**/*': (staged: ReadonlyArray<string>) => {
            const files = toFileArgs(staged)
            return `pnpm exec prettier --write ${files}`
        },

        [`*.md`]: (staged: ReadonlyArray<string>) => {
            const files = toFileArgs(staged)
            //  const ignores = toIgnoreArgs(mdIgnores)
            return [
                `pnpm exec prettier --write ${files}`,
                `pnpm exec markdownlint-cli2 --fix ${files}  || true`,
            ]
        },

        [extensionsToGlob(JSLIKE_FILE_EXTENSIONS)]: (
            staged: ReadonlyArray<string>,
        ) => {
            const files = toFileArgs(staged)
            return [
                `pnpm exec prettier --write ${files}`,
                `pnpm exec eslint --fix ${files}`,
            ]
        },

        [extensionsToGlob(PRETTIER_FILE_EXTENSIONS)]: (
            staged: ReadonlyArray<string>,
        ) => {
            const files = toFileArgs(staged)
            return `pnpm exec prettier --write ${files}`
        },
    }
    return config
}
export const lintstaged = {
    configuration: lintStagedConfig,
    quoteArg,
    toFileArgs,
}
export type LintStagedConfiguration = Configuration
