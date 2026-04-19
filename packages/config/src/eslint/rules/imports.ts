import sortPlugin from 'eslint-plugin-sort'
import { defineConfig, type Config } from '@eslint/config-helpers'
import { JSLIKE_FILE_EXTENSIONS } from '../../shared.js'
import { expandExtensions } from '../../helpers.js'

export const importRules = (): Config[] =>
    defineConfig(
        sortPlugin.configs['flat/recommended'],
        {
            name: 'Imports: default rules',
            rules: {
                'import/extensions': ['error', 'ignorePackages'],
                'import/no-default-export': 'off',
                'import/no-duplicates': 'warn',
                'import/order': [
                    'error',
                    {
                        alphabetize: { caseInsensitive: true, order: 'asc' },
                        groups: [
                            'external',
                            'builtin',
                            'internal',
                            'sibling',
                            'parent',
                            'index',
                        ],
                        pathGroups: [
                            { group: 'internal', pattern: 'components' },
                            { group: 'internal', pattern: 'common' },
                            { group: 'internal', pattern: 'routes/**' },
                            {
                                group: 'internal',
                                pattern: 'assets/**',
                                position: 'after',
                            },
                        ],
                        pathGroupsExcludedImportTypes: ['internal'],
                    },
                ],
                /** Use import plugin for import ordering, not sort plugin */
                'no-unused-vars': 'off',
                'sort/destructuring-properties': [
                    'error',
                    { caseSensitive: false, natural: true },
                ],
                'sort/exports': [
                    'error',
                    {
                        caseSensitive: false,
                        groups: [],
                        natural: true,
                        typeOrder: 'preserve',
                    },
                ],
                'sort/imports': 'off',
                'unused-imports/no-unused-imports': 'error',
            },
        },
        {
            files: [...expandExtensions(JSLIKE_FILE_EXTENSIONS, '**/src/**/*.')],
            name: 'Imports: warn on default exports in src files',
            rules: {
                'import/no-default-export': 'warn',
            },
        },
    )
