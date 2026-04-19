import vitestPlugin from '@vitest/eslint-plugin'
import { defineConfig, type Config } from '@eslint/config-helpers'
import { expandExtensions } from '../../helpers.js'
import { TS_FILE_EXTENSIONS } from '../../shared.js'

export const testingRules = (): Config[] =>
    defineConfig({
        files: [...expandExtensions(TS_FILE_EXTENSIONS, '**/*.test.')],
        languageOptions: {
            globals: {
                ...vitestPlugin.environments.env.globals,
            },
        },
        name: 'Testing: Vitest recommended with typecheck',
        rules: {
            ...vitestPlugin.configs.recommended.rules,
        },
        settings: {
            vitest: {
                typecheck: true,
            },
        },
    })
