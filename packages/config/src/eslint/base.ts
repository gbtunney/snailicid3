import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginsConfig from './plugins.js'
import { baseRules } from './rules/base.js'
import { importRules } from './rules/imports.js'
import { docsRules } from './rules/docs.js'
import { namingRules } from './rules/naming.js'
import { typescriptRules } from './rules/typescript.js'
import { testingRules } from './rules/testing.js'
import { reactRules } from './rules/react.js'
import { filePatternOverrides } from './overrides/files.js'
import { TS_FILE_EXTENSIONS } from '../shared.js'
import { expandExtensions } from '../helpers.js'
import { defineConfig, type Config } from '@eslint/config-helpers'

const base_files: Array<string> = [...expandExtensions(TS_FILE_EXTENSIONS, '*.')]
const base_ignores = [
    '**/dist/**/*',
    '**/node_modules/**',
    '**/dist/**',
    '**/types/**/*',
    '**/types/**',
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

export const flatEslintConfig = async (__dirname: string): Promise<Config[]> => {
    const EslintConfig: Config[] = defineConfig(
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
        ...(await pluginsConfig()),

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
