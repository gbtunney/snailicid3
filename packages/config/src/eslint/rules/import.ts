import {type Config,defineConfig}from '@eslint/config-helpers'
import { expandExtensions } from '../../helpers.js'
import {  JSLIKE_FILE_EXTENSIONS } from '../../shared.js'

export const importRules = (): Array<Config> => defineConfig(
    {
        name: 'Import: Default Rules',
        rules: {
            'import/extensions': ['error', 'ignorePackages'],
            'import/no-default-export': 'off',
            'import/no-duplicates': 'warn',
            /** @todo : think this was a bug? */
            'no-unused-vars': 'off',
            'unused-imports/no-unused-imports': 'error',
        },
    },
    {
        files: [...expandExtensions(JSLIKE_FILE_EXTENSIONS, '**/src/**/*.')],
        name: 'Import: no-default-export rule overridden for src files ',
        rules: {
            'import/no-default-export': 'warn',
        },
    },
)