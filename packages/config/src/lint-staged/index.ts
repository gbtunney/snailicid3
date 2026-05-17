import { type Configuration } from 'lint-staged'

/// the above didnt error even tho it was not listed as a dependency - figure out why??
export type LintStagedConfiguration = Configuration
import {
    filterFileArrByGlob,
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
export const toFileArgs = (
    staged: ReadonlyArray<string> | string,
): Array<string> => (Array.isArray(staged) ? staged : [staged]).map(quoteArg)

export const lintStagedConfig = (): LintStagedConfiguration => {
    const config: LintStagedConfiguration = {
        '.gitignore': 'pnpm exec prettier --write .gitignore',

        '.husky/**/*': (staged: ReadonlyArray<string>) => {
            const files = toFileArgs(staged)
            return `pnpm exec prettier --write ${files.join(' ')}`
        },

        [`*.md`]: (staged: ReadonlyArray<string>) => {
            const filtered = filterFileArrByGlob(staged, ['**/*.api.md'])
            const files = toFileArgs(filtered)

            if (files.length === 0) return []
            console.log('BEFORE@!!', filtered.length, 'AFTER ', staged.length)
            //  const ignores = toIgnoreArgs(mdIgnores)
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
            const filtered = filterFileArrByGlob(staged, ['**/*.api.md'])
            const files = toFileArgs(filtered)

            if (files.length === 0) return []
            console.log('BEFORE@!!', filtered.length, 'AFTER ', staged.length)
            return `pnpm exec prettier --write ${files.join(' ')}`
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
