import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, type Config } from '@eslint/config-helpers'
import { expandExtensions } from '../../helpers.js'
import { JS_FILE_EXTENSIONS } from '../../shared.js'

export const filePatternOverrides = (): Config[] =>
    defineConfig(
        {
            files: ['**/main.tsx'],
            name: 'Override: main.tsx — React entrypoint (camelCase filename, hooks, refresh)',
            ...reactHooks.configs.flat.recommended,
            ...reactRefresh.configs.vite,
            rules: {
                'filenames-simple/naming-convention': ['error', { rule: 'camelCase' }],
            },
        },
        {
            files: ['**/use*.ts', '**/use*.tsx'],
            name: 'Override: hook files — camelCase filename (e.g. useAudioRecorder.ts)',
            rules: {
                'filenames-simple/naming-convention': ['error', { rule: 'camelCase' }],
            },
        },
        {
            files: [...expandExtensions(['cjs', 'cts'], '*/**.')],
            name: 'Override: CommonJS files — relax module rules',
            rules: {
                '@typescript-eslint/no-unused-vars': 'warn',
                '@typescript-eslint/no-var-requires': 'off',
                'no-undef': 'error',
            },
        },
        {
            ...tseslint.configs.disableTypeChecked,
            files: [...expandExtensions(JS_FILE_EXTENSIONS, '**/*.')],
            name: 'Override: JS files — disable type-checked rules',
        },
        // TODO: storybook overrides
        // {
        //     files: ['**/*.stories.ts', '**/*.stories.tsx'],
        //     name: 'Override: Storybook story files',
        //     rules: {
        //         '@typescript-eslint/explicit-function-return-type': 'off',
        //         '@typescript-eslint/naming-convention': ['error', { selector: 'function', format: ['PascalCase', 'camelCase'] }],
        //     },
        // },
    )
