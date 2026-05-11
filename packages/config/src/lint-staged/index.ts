import { type Configuration } from 'lint-staged'
/// the above didnt error even tho it was not listed as a dependency - figure out why??
export type LintStagedConfiguration = Configuration
import {
    JSLIKE_FILE_EXTENSIONS,
    PRETTIER_FILE_EXTENSIONS,
} from './../shared.js'

export function defineLintStagedConfig<
    const Type extends LintStagedConfiguration,
>(config: Type): Type {
    return config
}

const extensionsToGlob = (extensions: ReadonlyArray<string>): string =>
    `*.{${extensions.join(',')}}`

export const quoteArg = (p: string): string => `"${p.replaceAll('"', '\\"')}"`
export const toFileArgs = (staged: ReadonlyArray<string> | string): string =>
    (Array.isArray(staged) ? staged : [staged]).map(quoteArg).join(' ')

export const lintStagedConfig = (): LintStagedConfiguration => {
    const config: LintStagedConfiguration = {
        '.gitignore':
            'LintStagedConfiguration exec prettier --write .gitignore',

        '.husky/**/*': (staged: ReadonlyArray<string>) => {
            const files = toFileArgs(staged)
            return `pnpm exec prettier --write ${files}`
        },

        [`*.md`]: (staged: ReadonlyArray<string>) => {
            const files = toFileArgs(staged)
            //  const ignores = toIgnoreArgs(mdIgnores)
            return [
                `pnpm exec prettier --write ${files}`,
                `pnpm exec markdownlint-cli2 --no-globs --fix ${files}  || true`,
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
    return defineLintStagedConfig(config)
}
export const lintstaged = {
    configuration: lintStagedConfig,
    defineLintStagedConfig,
    quoteArg,
    toFileArgs,
}
