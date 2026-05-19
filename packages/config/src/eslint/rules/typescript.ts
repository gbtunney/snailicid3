import { type Config, defineConfig } from '@eslint/config-helpers'
import tsEslint from 'typescript-eslint'
import { TS_FILE_EXTENSIONS } from '../../shared.js'
import { expandExtensions } from '../../utilities/extensions.js'

export const typescriptRules = (): Array<Config> => {
    return defineConfig([
        ...tsEslint.configs.recommended,
        ...tsEslint.configs.strictTypeChecked,
        {
            name: 'Typescript Rules : ERROR',
            /**
             * Typescript Rules that should throw error, please reference styleguide
             *
             * @see [TypeScript Style Guide](https://mkosir.github.io/typescript-style-guide/)
             */
            rules: {
                '@typescript-eslint/array-type': [
                    'error',
                    { default: 'generic' },
                ],
                '@typescript-eslint/ban-ts-comment': [
                    'error',
                    {
                        'ts-check': false,
                        'ts-expect-error': 'allow-with-description',
                        'ts-ignore': false,
                        'ts-nocheck': true,
                    },
                ],
                '@typescript-eslint/consistent-type-definitions': [
                    'error',
                    'type',
                ],
                '@typescript-eslint/no-explicit-any': 'warn',

                '@typescript-eslint/no-namespace': 'warn',
                '@typescript-eslint/no-unnecessary-type-parameters': 'off',

                '@typescript-eslint/no-unused-vars': 'off',
                '@typescript-eslint/prefer-as-const': 'error',
            },
        },
        /** Typescript Rules that should WARN, overidden from recommended */
        {
            name: 'Typescript Rules : WARN (general overrides from ts-recommended)',
            rules: {
                '@typescript-eslint/no-explicit-any': 'warn',
                '@typescript-eslint/no-namespace': 'warn',

                '@typescript-eslint/no-unnecessary-condition': 'warn',
                '@typescript-eslint/no-unsafe-argument': 'warn',
                '@typescript-eslint/no-unsafe-assignment': 'warn',
                '@typescript-eslint/no-unsafe-call': 'warn',
                '@typescript-eslint/no-unsafe-member-access': 'warn',
                '@typescript-eslint/no-unsafe-return': 'warn',
            },
        },
        /**
         * Typescript Rules that are OFF, overidden from recommended
         *
         * @todo : configure for enviroment someday
         */
        {
            name: 'Typescript Rules : OFF (general overrides from ts-recommended)',
            rules: {
                '@typescript-eslint/no-unnecessary-type-parameters': 'off',
                '@typescript-eslint/no-unused-vars': 'off',
            },
        },
        /** Typescript Rules overwritten for files in source folders */
        {
            files: [...expandExtensions(TS_FILE_EXTENSIONS, '**/src/**/*.')],
            name: 'Typescript Rules : Explicit Return Type for files in source folders',
            rules: {
                '@typescript-eslint/explicit-function-return-type': 'error',
            },
        },
        /* {
            files: ['**!/!*.ts', '**!/!*.tsx'],
            rules: {
                typechecked stuff moved up ^
            },
        },*/
    ])
}
export default typescriptRules
