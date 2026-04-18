import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, type Config } from '@eslint/config-helpers'

export const reactRules = (): Config[] =>
    defineConfig(
        reactHooks.configs.flat.recommended,
        reactRefresh.configs.vite,
        {
            name: 'React: naming convention for functions in JSX/TSX',
            rules: {
                '@typescript-eslint/naming-convention': [
                    'error',
                    {
                        format: ['PascalCase', 'camelCase'],
                        selector: 'function',
                    },
                ],
                'sort/destructuring-properties': [
                    'error',
                    { caseSensitive: false, natural: true },
                ],
            },
        },
    )
