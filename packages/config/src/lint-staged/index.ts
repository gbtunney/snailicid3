import { type Configuration } from 'lint-staged'

// Lint-staged is still necessary: it scopes pre-commit linting to staged files
// only, making commits fast regardless of repo size.

const JS_EXTS = '{js,mjs,cjs,jsx,ts,mts,cts,tsx}'
const PRETTIER_EXTS = '{json,xml,php,html,css,sh,yaml,yml,graphql}'

//const mdIgnores: Array<string> = markdownlint.ignores()

export const quoteArg = (p: string): string => `"${p.replaceAll('"', '\\"')}"`
export const toFileArgs = (staged: ReadonlyArray<string> | string): string =>
    (Array.isArray(staged) ? staged : [staged]).map(quoteArg).join(' ')
//const toIgnoreArgs = (ignores: Array<string>) => ignores.map(quoteArg).join(' ')

export const lintStagedConfig: Configuration = {
    '.gitignore': 'pnpm exec prettier --write .gitignore',

    '.husky/**/*': (staged: ReadonlyArray<string>) => {
        const files = toFileArgs(staged)
        return `pnpm exec prettier --write ${files}`
    },

    [`*.${JS_EXTS}`]: (staged: ReadonlyArray<string>) => {
        const files = toFileArgs(staged)
        return [
            `pnpm exec prettier --write ${files}`,
            `pnpm exec eslint --fix ${files}`,
        ]
    },

    [`*.${PRETTIER_EXTS}`]: (staged: ReadonlyArray<string>) => {
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
}

export const lintStaged = {
    configuration: lintStagedConfig,
    quoteArg,
    toFileArgs,
}
export type LintStagedConfiguration = Configuration
