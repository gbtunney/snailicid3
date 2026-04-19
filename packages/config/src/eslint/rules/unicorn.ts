import { type Config, defineConfig } from '@eslint/config-helpers'

export const unicornRules = (): Array<Config> =>
    defineConfig(
        {
            name: 'Unicorn: Default Rules',
            rules: {
                'import/extensions': ['error', 'ignorePackages'],
                'import/no-default-export': 'off',
                'import/no-duplicates': 'warn',
                /** @todo : think this was a bug? */
                'no-unused-vars': 'off',
                // --- Core (low-noise, high value) ---
                // Safe improvements, minimal style enforcement
                'unicorn/better-regex': 'warn',

                'unicorn/no-abusive-eslint-disable': 'error',
                // --- Explicitly disabled (conflicts with your style) ---
                'unicorn/no-array-for-each': 'off',
                'unicorn/no-array-method-this-argument': 'error',
                // --- Optional (stricter / opinionated) ---
                // Enable only if you want stronger guidance
                'unicorn/no-array-reduce': 'warn',
                // --- Immutability / modern APIs ---
                // Prefer non-mutating methods
                'unicorn/no-array-reverse': 'warn',
                // → toReversed()
                'unicorn/no-array-sort': 'warn',

                'unicorn/no-empty-file': 'warn',
                'unicorn/no-for-loop': 'off',
                'unicorn/no-instanceof-array': 'error',
                'unicorn/no-null': 'off',
                // → toSorted()
                'unicorn/no-unnecessary-array-flat-depth': 'warn',

                'unicorn/no-unnecessary-array-splice-count': 'warn',
                'unicorn/no-unnecessary-await': 'warn',
                'unicorn/no-unnecessary-slice-end': 'warn',

                'unicorn/no-unreadable-array-destructuring': 'warn',
                'unicorn/prefer-export-from': 'warn',

                'unicorn/prefer-node-protocol': 'warn',
                'unicorn/prevent-abbreviations': 'off',
                // --- Import / module hygiene ---
                // Keep explicit `./` style
                'unicorn/relative-url-style': ['error', 'always'],
                'unused-imports/no-unused-imports': 'error',
            },
        },
        /**
         * @example
         *     ;```ts
         *      'unicorn/prevent-abbreviations': ['warn', {
         *         replacements: {
         *             t: {
         *                 type: true,
         *             },
         *             k: {
         *                 key: true,
         *             },
         *         },
         *     }]```
         */
    )
