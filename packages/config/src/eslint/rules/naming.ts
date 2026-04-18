import { defineConfig, type Config } from '@eslint/config-helpers'
import { TS_FILE_EXTENSIONS } from '../../shared.js'
import { expandExtensions } from '../../helpers.js'

export const namingRules = (error: boolean = true): Config[] =>
    defineConfig(
        {
            files: [...expandExtensions(TS_FILE_EXTENSIONS, '**/src/**/*.')],
            name: 'Naming: general rules for source files',
            rules: {
                '@typescript-eslint/naming-convention': [
                    error ? 'error' : 'warn',
                    {
                        format: ['camelCase', 'UPPER_CASE'],
                        modifiers: ['exported', 'const'],
                        selector: ['variable'],
                    },
                    {
                        format: ['snake_case', 'camelCase', 'UPPER_CASE'],
                        modifiers: ['exported', 'const'],
                        selector: 'variable',
                        types: ['string'],
                    },
                    {
                        format: ['camelCase'],
                        modifiers: ['exported'],
                        selector: ['variable', 'function'],
                    },
                    {
                        format: ['snake_case', 'camelCase'],
                        leadingUnderscore: 'allowSingleOrDouble',
                        selector: 'parameter',
                    },
                    {
                        format: ['PascalCase'],
                        selector: 'typeLike',
                    },
                    {
                        format: ['UPPER_CASE', 'PascalCase'],
                        modifiers: ['exported'],
                        selector: 'typeAlias',
                    },
                    {
                        custom: { match: true, regex: '^[A-Z]([A-Z]|[a-z]){2,}' },
                        format: ['PascalCase'],
                        selector: 'typeParameter',
                    },
                    {
                        format: ['UPPER_CASE'],
                        modifiers: ['exported', 'const'],
                        selector: 'variable',
                        types: ['array'],
                    },
                    {
                        format: ['UPPER_CASE'],
                        selector: 'enum',
                    },
                    {
                        format: ['PascalCase'],
                        selector: 'enumMember',
                    },
                    {
                        format: ['camelCase'],
                        leadingUnderscore: 'require',
                        modifiers: ['private'],
                        selector: 'memberLike',
                    },
                ],
            },
        },
        {
            files: [...expandExtensions(TS_FILE_EXTENSIONS, '**/src/**/index.')],
            name: 'Naming: overrides for index files in src',
            rules: {
                '@typescript-eslint/naming-convention': [
                    error ? 'error' : 'warn',
                    {
                        format: ['strictCamelCase', 'PascalCase'],
                        modifiers: ['exported'],
                        selector: ['function'],
                    },
                    {
                        format: ['strictCamelCase', 'PascalCase', 'UPPER_CASE'],
                        modifiers: ['exported', 'const'],
                        selector: ['variable'],
                    },
                    {
                        format: ['StrictPascalCase'],
                        leadingUnderscore: 'allowSingleOrDouble',
                        prefix: [
                            'is',
                            'should',
                            'has',
                            'can',
                            'does',
                            'do',
                            'did',
                            'use',
                            'will',
                        ],
                        selector: 'parameter',
                        types: ['boolean'],
                    },
                ],
            },
        },
        {
            name: 'Naming: filenames OFF (filenames-simple)',
            rules: {
                'filenames-simple/no-index': 'off',
                'filenames-simple/pluralize': 'off',
            },
        },
        {
            files: ['**/src/**/*'],
            name: 'Naming: filename convention in src (filenames-simple)',
            rules: {
                'filenames-simple/naming-convention': 'error',
            },
        },
        {
            name: 'Naming: check-file rules',
            rules: {
                // TODO: migrate filename rules from filenames-simple to check-file plugin
            },
        },
    )
