import { type Config, defineConfig } from '@eslint/config-helpers'
import sortPlugin from 'eslint-plugin-sort'
import { expandExtensions } from '../../helpers.js'
import { JSLIKE_FILE_EXTENSIONS } from '../../shared.js'

export const importRules = (): Array<Config> =>
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
            files: [
                ...expandExtensions(JSLIKE_FILE_EXTENSIONS, '**/src/**/*.'),
            ],
            name: 'Imports: warn on default exports in src files',
            rules: {
                //TODO 'import-x/prefer-default-export': 'warn',
                'import/no-default-export': 'off',
            },
        },
    )
