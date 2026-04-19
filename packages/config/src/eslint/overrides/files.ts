import { type Config, defineConfig } from '@eslint/config-helpers'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { expandExtensions } from '../../helpers.js'
import { JS_FILE_EXTENSIONS } from '../../shared.js'

export const filePatternOverrides = (): Array<Config> =>
    defineConfig(
        {
            files: ['**/main.tsx'],
            name: 'Override: main.tsx — React entrypoint (hooks, refresh, camelCase filename)',
            rules: {
                ...(reactHooks.configs.flat.recommended.rules ?? {}),
                ...(reactRefresh.configs.vite.rules ?? {}),
            },
        },
        {
            files: ['**/use*.ts', '**/use*.tsx'],
            name: 'Override: hook files — camelCase filename (e.g. useAudioRecorder.ts)',
            rules: {},
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
