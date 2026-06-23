import { type Configuration as LintStagedConfig } from 'lint-staged'
import {
    filterFileArrByGlob,
    JSLIKE_FILE_EXTENSIONS,
    PRETTIER_FILE_EXTENSIONS,
} from './../shared.js'
import { extensionsToGlob, toFileArgs } from './helpers.js'

export const getLintStagedDefaultConfig = (): LintStagedConfig => {
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
    return config
}
