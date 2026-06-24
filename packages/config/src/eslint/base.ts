import { type Config, defineConfig } from '@eslint/config-helpers'
import globals from 'globals'
import { filePatternOverrides } from './overrides/files.js'
import { getBuiltInPlugins } from './plugins.js'
import { baseRules } from './rules/base.js'
import { codeStyleRules } from './rules/codestyle.js'
import { commentsRules } from './rules/comments.js'
import { directiveRules } from './rules/directives.js'
import { importRules } from './rules/imports.js'
import { namingRules } from './rules/naming.js'
import { reactRules } from './rules/react.js'
import { testingRules } from './rules/testing.js'
import { typescriptRules } from './rules/typescript.js'
import { JS_FILE_EXTENSIONS, TS_FILE_EXTENSIONS } from '../shared.js'
import { expandExtensions } from '../utilities/extensions.js'
import { type PathRoot, resolveCwd } from '../utilities/path.js'

export const BASE_FILES: Array<string> = [
    ...expandExtensions(TS_FILE_EXTENSIONS, '*.'),
]
export const BASE_IGNORES: Array<string> = [
    '**/dist/**/*',
    '**/node_modules/**',
    '**/dist/**',
    '**/docs/**',
    '**/coverage/**',
    '**/.history/**',
    '**/scratch/**',
    '**/.venv/**',
    '**/venv/**',
    '**/__pycache__/**',
    '**/*.py',
    '**/*.d.*',
    '**/*.map',
    '**/storybook-static/**',
    ...expandExtensions(JS_FILE_EXTENSIONS, '**/types/**/*.'),
]

/**
 * Builds the recommended flat ESLint config array.
 *
 * - `cwd`: used as `tsconfigRootDir`.
 * - `ignores`: appended to `BASE_IGNORES`.
 * - `global_files`: override the global files.
 */
export const buildDefaultEslintConfig = ({
    cwd,
    globalFiles = BASE_FILES,
    globalIgnores = [],
}: {
    cwd: PathRoot
    globalFiles?: Array<string>
    globalIgnores?: Array<string>
}): Array<Config> => {
    const tsconfigRootDir = resolveCwd(cwd)
    const EslintConfig: Array<Config> = [
        {
            ignores: [...BASE_IGNORES, ...globalIgnores],
            name: 'Base: ignored paths',
        },
        ...defineConfig(
            {
                files: globalFiles,
                name: 'Base: included file extensions',
            },
            {
                languageOptions: {
                    globals: { ...globals.browser, ...globals.node },
                    parserOptions: {
                        projectService: true,
                        tsconfigRootDir,
                    },
                },
                name: 'Base: globals and projectService',
            },
            /** PLUGIN CONFIG */
            ...getBuiltInPlugins(),

            /** Global defaults */
            ...baseRules(),

            /** Concern-based rules */
            ...typescriptRules(),
            ...importRules(),
            ...namingRules(),
            ...commentsRules(),
            ...codeStyleRules(),
            ...directiveRules(),
            ...reactRules(),
            ...testingRules(),

            /** File-pattern overrides — all exceptions in one place */
            ...filePatternOverrides(),
        ),
    ]
    return EslintConfig
}

export default buildDefaultEslintConfig
