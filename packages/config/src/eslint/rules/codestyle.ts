import { type Config, defineConfig } from '@eslint/config-helpers'

/**
 * Code Style: modern JS best-practices via eslint-plugin-unicorn — immutability, ES2021+ APIs, readability, and module
 * hygiene. Also covers general formatting guards like empty lines.
 *
 * @see [eslint-plugin-unicorn](https://github.com/sindresorhus/eslint-plugin-unicorn)
 */
export const codeStyleRules = (): Array<Config> =>
    defineConfig(
        /** Array methods — prefer immutable/modern equivalents (ES2023+) */
        {
            name: 'Code Style: Array / immutability',
            rules: {
                'unicorn/no-array-for-each': 'off',
                'unicorn/no-array-method-this-argument': 'error',
                'unicorn/no-array-reduce': 'warn',
                'unicorn/no-array-reverse': 'warn',
                'unicorn/no-array-sort': 'warn',
                'unicorn/no-instanceof-array': 'error',
                'unicorn/no-unnecessary-array-flat-depth': 'warn',
                'unicorn/no-unnecessary-array-splice-count': 'warn',
                'unicorn/no-unreadable-array-destructuring': 'warn',
            },
        },

        /** Async / control flow */
        {
            name: 'Code Style: Async / control flow',
            rules: {
                'unicorn/no-for-loop': 'off',
                'unicorn/no-unnecessary-await': 'warn',
            },
        },

        /** String / buffer */
        {
            name: 'Code Style: String / buffer',
            rules: {
                'unicorn/no-unnecessary-slice-end': 'warn',
            },
        },

        /** Regex */
        {
            name: 'Code Style: Regex',
            rules: {
                'unicorn/better-regex': 'warn',
            },
        },

        /** Module / import hygiene — node: protocol, re-export style, relative paths */
        {
            name: 'Code Style: Module / import hygiene',
            rules: {
                'unicorn/prefer-export-from': 'warn',
                'unicorn/prefer-node-protocol': 'warn',
                'unicorn/relative-url-style': ['error', 'always'],
            },
        },

        /** Readability / general style */
        {
            name: 'Code Style: Readability',
            rules: {
                'unicorn/no-abusive-eslint-disable': 'error',
                'unicorn/no-empty-file': 'warn',
                'unicorn/no-null': 'off',
                /**
                 * @example
                 *     'unicorn/prevent-abbreviations': ['warn', {
                 *     replacements: { t: { type: true }, k: { key: true } },
                 *     }]
                 */
                'unicorn/prevent-abbreviations': 'off',
            },
        },
    )

export { default as unicornPlugin } from 'eslint-plugin-unicorn'
