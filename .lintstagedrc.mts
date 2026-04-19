// Lint-staged is still necessary: it scopes pre-commit linting to staged files
// only, making commits fast regardless of repo size.

const JS_EXTS = '{js,mjs,cjs,jsx,ts,mts,cts,tsx}'
const PRETTIER_EXTS = '{json,xml,php,html,css,sh,yaml,yml,graphql}'

const mdIgnores = [
    '#**/node_modules/**',
    '#**/.changeset/**',
    '#**/docs/**',
    '#**/scratch/**',
    '#packages/cli-template/templates/**/*',
]

const quoteArg = (p: string) => `"${p.replaceAll('"', '\\"')}"`
const toFileArgs = (staged: string | Array<string>) =>
    (Array.isArray(staged) ? staged : [staged]).map(quoteArg).join(' ')
const toIgnoreArgs = (ignores: Array<string>) => ignores.map(quoteArg).join(' ')

export default {
    [`*.${JS_EXTS}`]: (staged: Array<string>) => {
        const files = toFileArgs(staged)
        return [
            `pnpm exec prettier --write ${files}`,
            `pnpm exec eslint --flag unstable_ts_config --fix ${files}`,
        ]
    },

    [`*.md`]: (staged: Array<string>) => {
        const files = toFileArgs(staged)
        const ignores = toIgnoreArgs(mdIgnores)
        return [
            `pnpm exec prettier --write ${files}`,
            `pnpm exec markdownlint-cli2 ${files} ${ignores} || true`,
        ]
    },

    [`*.${PRETTIER_EXTS}`]: (staged: Array<string>) => {
        const files = toFileArgs(staged)
        return `pnpm exec prettier --write ${files}`
    },

    '.gitignore': 'pnpm exec prettier --write .gitignore',

    '.husky/**/*': (staged: Array<string>) => {
        const files = toFileArgs(staged)
        return `pnpm exec prettier --write ${files}`
    },
}
