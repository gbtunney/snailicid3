import vitestPlugin from 'eslint-plugin-vitest'
import { getFileExtensionList, TS_FILE_EXTENSIONS } from '../../utilities.js'
import {defineConfig,type Config}from '@eslint/config-helpers'

export const vitestRules = (): Config []=> defineConfig(
    {
        files: [...getFileExtensionList(TS_FILE_EXTENSIONS, false, '**/*.test.')],
        languageOptions: {
            globals: {
                ...vitestPlugin.environments.env.globals,
            },
        },
        name: 'Vitest: Recommended, Typecheck enabled',
        rules: {
            ...vitestPlugin.configs.recommended.rules,
        },
        settings: {
            vitest: {
                typecheck: true,
            },
        },
    },
)