import { type Config, defineConfig } from '@eslint/config-helpers'
import { expandExtensions } from '../../helpers.js'
import { TS_FILE_EXTENSIONS } from '../../shared.js'

/**
 * Naming: symbol naming conventions (variables, functions, types, enums) via `@typescript-eslint/naming-convention`,
 * and filename/folder conventions via `check-file`.
 */
export const namingRules = (error: boolean = true): Array<Config> =>
    defineConfig(
        {
            files: [...expandExtensions(TS_FILE_EXTENSIONS, '**/src/**/*.')],
            name: 'Naming: general rules for source files',
            rules: {
                '@typescript-eslint/naming-convention': [
                    error ? 'error' : 'warn',

                    /** Exported const variables: allow `camelCase` or `UPPER_CASE` (e.g. `foo`, `FOO`). */
                    {
                        format: ['camelCase', 'UPPER_CASE'],
                        modifiers: ['exported', 'const'],
                        selector: ['variable'],
                    },

                    /** Exported const string variables: also allow `snake_case` (common for env keys / tokens). */
                    {
                        format: ['snake_case', 'camelCase', 'UPPER_CASE'],
                        modifiers: ['exported', 'const'],
                        selector: 'variable',
                        types: ['string'],
                    },

                    /** Exported functions/variables: default to `camelCase` (public API names). */
                    {
                        format: ['camelCase'],
                        modifiers: ['exported'],
                        selector: ['variable', 'function'],
                    },

                    /** Function parameters: allow `_foo`/`__foo` and either `camelCase` or `snake_case`. */
                    {
                        format: ['snake_case', 'camelCase'],
                        leadingUnderscore: 'allowSingleOrDouble',
                        selector: 'parameter',
                    },

                    /** Types/interfaces/classes/etc: enforce `PascalCase`. */
                    {
                        format: ['PascalCase'],
                        selector: 'typeLike',
                    },

                    /** Exported type aliases: allow `PascalCase` or `UPPER_CASE` (e.g. `Result`, `UUID`). */
                    {
                        format: ['UPPER_CASE', 'PascalCase'],
                        modifiers: ['exported'],
                        selector: 'typeAlias',
                    },

                    /** Exported const arrays: require `UPPER_CASE` (treat as constant lists). */
                    {
                        format: ['UPPER_CASE'],
                        modifiers: ['exported', 'const'],
                        selector: 'variable',
                        types: ['array'],
                    },

                    /** Enums: require `UPPER_CASE` for enum names. */
                    {
                        format: ['UPPER_CASE'],
                        selector: 'enum',
                    },

                    /** Enum members: require `PascalCase` (e.g. `MyValue`). */
                    {
                        format: ['PascalCase'],
                        selector: 'enumMember',
                    },

                    /** Private class members: require leading underscore + `camelCase` (e.g. `_cache`). */
                    {
                        format: ['camelCase'],
                        leadingUnderscore: 'require',
                        modifiers: ['private'],
                        selector: 'memberLike',
                    },

                    /** Generic type parameters: require longer PascalCase-ish names (avoid `T`, allow `Key`, `Value`). */
                    {
                        custom: {
                            match: true,
                            regex: '^[A-Z]([A-Z]|[a-z]){2,}',
                        },
                        format: ['PascalCase'],
                        selector: 'typeParameter',
                    },

                    /** Unused parameters: allow `_x`/`__x` plus camel/snake; used to silence "unused" intentionally. */
                    {
                        format: ['camelCase', 'snake_case'],
                        leadingUnderscore: 'allowSingleOrDouble',
                        modifiers: ['unused'],
                        selector: 'parameter',
                    },

                    /** Parameters (non-underscore): enforce min length >= 3 to avoid `i`, `e`, `x`-style names. */
                    {
                        custom: {
                            match: true,
                            regex: '^[a-zA-Z][a-zA-Z0-9_]{2,}$',
                        },
                        filter: {
                            match: true,
                            regex: '^[^_]',
                        },
                        format: ['camelCase', 'snake_case'],
                        selector: 'parameter',
                    },
                ],
            },
        },
        {
            files: [
                ...expandExtensions(TS_FILE_EXTENSIONS, '**/src/**/index.'),
            ],
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
            name: 'Naming: check-file rules',
            rules: {},
        },
    )

export default namingRules
