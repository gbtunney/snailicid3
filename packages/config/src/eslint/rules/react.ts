import { type Config, defineConfig } from '@eslint/config-helpers'
import reactPlugin from 'eslint-plugin-react'
import _reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { expandExtensions } from '../../helpers.js'

/**
 * React: generic baseline rules, hooks enforcement, and Vite HMR fast-refresh compatibility. Scopes JSX/TSX-specific
 * rules to `.tsx`/`.jsx` source files only.
 */
export const reactRules = (): Array<Config> =>
    defineConfig(
        /** Generic React rules — scoped to JSX/TSX src files */
        {
            files: [...expandExtensions(['tsx', 'jsx'], '**/src/**/*.')],
            name: 'React: generic baseline',
            rules: {
                ...(
                    reactPlugin.configs.flat.recommended as {
                        rules: Record<string, unknown>
                    }
                ).rules,
                ...(
                    reactPlugin.configs.flat['jsx-runtime'] as {
                        rules: Record<string, unknown>
                    }
                ).rules,
                'react/jsx-boolean-value': ['error', 'never'],
                'react/jsx-curly-brace-presence': [
                    'error',
                    { children: 'never', props: 'never' },
                ],
                'react/jsx-no-useless-fragment': 'warn',
                'react/no-array-index-key': 'warn',
                'react/self-closing-comp': 'error',
            },
            settings: { react: { version: 'detect' } },
        },

        /** Hooks rules — applies to all JS/TS files (hooks can be in non-JSX files) */
        {
            name: 'React: hooks',
            rules: {
                ..._reactHooks.configs.flat.recommended.rules,
            },
        },

        /** Vite fast-refresh — only relevant in app/component src files */
        {
            files: [...expandExtensions(['tsx', 'jsx'], '**/src/**/*.')],
            name: 'React: Vite fast-refresh',
            rules: {
                ...reactRefresh.configs.vite.rules,
            },
        },
    )

export default reactRules
