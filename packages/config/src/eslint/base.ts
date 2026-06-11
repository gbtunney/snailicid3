import { type Config, defineConfig } from '@eslint/config-helpers'
import globals from 'globals'
import { filePatternOverrides } from './overrides/files.js'
import pluginsConfig from './plugins.js'
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

export type EslintConfigOptions = {
    /** Appended to whichever `files` list is in effect (array concat — applies even if `files` is given). */
    additionalFiles?: Array<string>
    /** Used as `tsconfigRootDir` for typescript-eslint's `projectService`. Defaults to `process.cwd()`. */
    cwd?: string
    /** Replaces `BASE_FILES` entirely if provided. */
    files?: Array<string>
    /** Appended to `BASE_IGNORES` (array concat). */
    ignores?: Array<string>
    /** Extra flat-config objects appended last (highest precedence in ESLint's cascade). */
    overrides?: Array<Config>
}

export const resolveEslintFiles = ({
    additionalFiles = [],
    files = BASE_FILES,
}: Pick<
    EslintConfigOptions,
    'additionalFiles' | 'files'
> = {}): Array<string> => [...files, ...additionalFiles]

/**
 * Builds the recommended flat ESLint config array.
 *
 * - `files`: replaces `EsLint.files.base()` if provided.
 * - `additionalFiles`: always appended to whichever `files` list is in effect.
 * - `ignores`: appended to `BASE_IGNORES`.
 * - `overrides`: extra flat-config objects appended last.
 * - `cwd`: used as `tsconfigRootDir`. Defaults to `process.cwd()`.
 */
export const buildEslintConfig = ({
    additionalFiles,
    cwd = process.cwd(),
    files,
    ignores = [],
    overrides = [],
}: EslintConfigOptions = {}): Array<Config> => {
    const EslintConfig: Array<Config> = [
        { ignores: [...BASE_IGNORES, ...ignores], name: 'Base: ignored paths' },
        ...defineConfig(
            {
                files: resolveEslintFiles({ additionalFiles, files }),
                name: 'Base: included file extensions',
            },
            {
                languageOptions: {
                    globals: { ...globals.browser, ...globals.node },
                    parserOptions: {
                        projectService: true,
                        tsconfigRootDir: cwd,
                    },
                },
                name: 'Base: globals and projectService',
            },
            ...pluginsConfig(),

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

            ...overrides,
        ),
    ]
    return EslintConfig
}

export default buildEslintConfig
