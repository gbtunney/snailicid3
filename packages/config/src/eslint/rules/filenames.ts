import {defineConfig,type Config}from '@eslint/config-helpers'

export const filenamesRules = (): Config[] => defineConfig(
    /** @todo : is there a recommended config? dont know if this is needed */
    {
        name: 'Filenames: OFF',
        rules: {
            'filenames-simple/no-index': 'off',
            'filenames-simple/pluralize': 'off',
        },
    },
    {
        files: ['**/src/**/*'],
        name: 'Filenames: Naming Convention ERROR',
        rules: {
            'filenames-simple/naming-convention': 'error',
        },
    },
)