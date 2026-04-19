import _reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, type Config } from '@eslint/config-helpers'

export const reactRules = (): Config[] =>
    defineConfig({
        name: 'React: hooks, refresh, and JSX/TSX naming',
        rules: {
            ..._reactHooks.configs.flat.recommended.rules,
            ...(reactRefresh.configs.vite.rules ?? {}),
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
    })
