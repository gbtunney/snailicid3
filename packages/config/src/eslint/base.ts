import {type Config,defineConfig}from '@eslint/config-helpers'
import pluginJs from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import {expandExtensions}from './../helpers.js'
import pluginsConfig from './plugins.js'
import { checkFileRules } from './rules/check-file.js'
import { eslintCommentRules } from './rules/eslint-comments.js'
import { importRules } from './rules/import.js'
import { jsdocRules } from './rules/jsdoc.js'
import { namingConventionRules } from './rules/naming-convention.js'
import {reactRules} from './rules/react.js'
import { sortRules } from './rules/sort.js'
import { typescriptRules } from './rules/typescript.js'
import { vitestRules } from './rules/vitest.js'
import { SHARED_FORMATTING_RULES } from '../prettier/index.js'
import { JS_FILE_EXTENSIONS, TS_FILE_EXTENSIONS } from '../shared.js'
const base_files: Array<string> = [...expandExtensions(TS_FILE_EXTENSIONS, '*.')]
const base_ignores = [
    '**/dist/**/*',
    '**/node_modules/**',
    '**/dist/**',
    '**/types/**/*',
    '**/types/**',
    '!**/packages/types/**',

    /** SYSTEM */
    '**/.history/**',
     '**/scratch/**',
   // '**/examples/**',
   /** python related ignores TODO: idkk is this needed? */
'**/.venv/**',
            '**/venv/**',
            '**/__pycache__/**',
            '**/*.py',
    
    /** DECLARATIONS */
    '**/*.d.*',
   // '**/*.d.mts',
   // '**/*.d.cts',
    '**/*.map',
/** STORYBOOK */
      '**/storybook-static/**',
]

export const flatEslintConfig = async (__dirname: string): Promise<Array<Config>> => {
    const EslintConfig: Array<Config>= defineConfig(
        { files: base_files, name: 'Custom Base Configuration : Includes' },
        { ignores: base_ignores, name: 'Custom Base Configuration : Ignores' },
        {
            languageOptions: {
                globals: { ...globals.browser, ...globals.node },
                parserOptions: {
                    // project: true,
                    projectService: true,
                    tsconfigRootDir: __dirname,
                },
            },
            name: 'Custom Base Configuration : globals, parserOptions, projectService',
        },
        ...(await pluginsConfig()),

        /** RULES START HERE */
        pluginJs.configs.recommended,
        ...(await typescriptRules()),
        ...(await importRules()),
        ...(await sortRules()),
        ...(await vitestRules()),
        ...(await jsdocRules()),
        ...(await checkFileRules()),
        ...(await namingConventionRules()),
        ...(await eslintCommentRules()),
...(await reactRules()),
        /**
         * No multiple empty lines should ERROR
         *
         * @todo: not even sure if this works?
         */
        {
            name: 'TODO: No multiple empty lines ERROR',
            rules: {
                'no-multiple-empty-lines': [
                    'error',
                    { max: SHARED_FORMATTING_RULES.maxEmptyLines },
                ],
            },
        },

        /** Common JS Rules */
        {
            files: [...expandExtensions(['cjs', 'cts'], '*/**.')],
            name: 'Custom CommonJS Rules',
            rules: {
                '@typescript-eslint/no-unused-vars': 'warn',
                '@typescript-eslint/no-var-requires': 'off',
                'no-undef': 'error',
            },
        },

        /** ** Typescript Eslint : Disable Type Checked for js files */
        {
            // Take the preset and apply only to JS extensions
            ...tseslint.configs.disableTypeChecked,
            files: [...expandExtensions(JS_FILE_EXTENSIONS, '**/*.')],
            name: 'Typescript Eslint : Disable Type Checked for js files',
        },
    )
    return EslintConfig
}

export default flatEslintConfig
