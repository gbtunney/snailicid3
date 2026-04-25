import { type Config, defineConfig } from '@eslint/config-helpers'
import globals from 'globals'
import { filePatternOverrides } from './overrides/files.js'
import pluginsConfig from './plugins.js'
import { baseRules } from './rules/base.js'
import { docsRules } from './rules/docs.js'
import { importRules } from './rules/imports.js'
import { namingRules } from './rules/naming.js'
import { reactRules } from './rules/react.js'
import { testingRules } from './rules/testing.js'
import { typescriptRules } from './rules/typescript.js'
import { expandExtensions } from '../helpers.js'
import { TS_FILE_EXTENSIONS } from '../shared.js'

const base_files: Array<string> = [
    ...expandExtensions(TS_FILE_EXTENSIONS, '*.'),
]
const base_ignores = [
    '**/dist/**/*',
    '**/node_modules/**',
    '**/dist/**',
    '**/docs/**',
    '**/coverage/**',
    '**/types/**/*',
    '**/types/**',
    '!packages/types/**',
    '**/.history/**',
    '**/scratch/**',
    '**/.venv/**',
    '**/venv/**',
    '**/__pycache__/**',
    '**/*.py',
    '**/*.d.*',
    '**/*.map',
    '**/storybook-static/**',
]

export const flatEslintConfig = (__dirname: string): Array<Config> => {
    const EslintConfig: Array<Config> = defineConfig(
        { files: base_files, name: 'Base: included file extensions' },
        { ignores: base_ignores, name: 'Base: ignored paths' },
        {
            languageOptions: {
                globals: { ...globals.browser, ...globals.node },
                parserOptions: {
                    projectService: true,
                    tsconfigRootDir: __dirname,
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
        ...docsRules(),
        ...namingRules(),
        ...reactRules(),
        ...testingRules(),

        /** File-pattern overrides — all exceptions in one place */
        ...filePatternOverrides(),
    )
    return EslintConfig
}

export default flatEslintConfig
