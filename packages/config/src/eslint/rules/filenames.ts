import { type Config, defineConfig } from '@eslint/config-helpers'
/** File and folder naming rules using eslint-plugin-check-file. */
/**
 * TODO mayble make a naming convention folder afetr refactor for this and storybook rules and naming convention file
 */
export const filescheckRules = (): Array<Config> =>
    defineConfig(
        {
            name: 'Check File: defaults',
            rules: {
                /** General source naming default. Adjust this if your repo standard is different. */
                'check-file/filename-naming-convention': [
                    'error',
                    {
                        '**/src/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}':
                            'KEBAB_CASE',
                    },
                ],
            },
        },
        {
            /** React component files may use PascalCase. */
            files: ['**/src/**/*.tsx'],
            name: 'Check File: React component filenames',
            rules: {
                'check-file/filename-naming-convention': [
                    'error',
                    {
                        '**/src/**/*.tsx': 'PASCAL_CASE',
                    },
                ],
            },
        },
        {
            /** Hook files must remain camelCase, matching the old use*.ts/use*.tsx rule. */
            files: ['**/src/**/use*.ts', '**/src/**/use*.tsx'],
            name: 'Check File: hook filenames',
            rules: {
                'check-file/filename-naming-convention': [
                    'error',
                    {
                        '**/src/**/use*.ts': 'CAMEL_CASE',
                        '**/src/**/use*.tsx': 'CAMEL_CASE',
                    },
                ],
            },
        },
        {
            /** Explicit allowance for Vite/React entry files like main.tsx. */
            files: ['**/main.tsx'],
            name: 'Check File: main entry filename',
            rules: {
                'check-file/filename-naming-convention': [
                    'error',
                    {
                        '**/main.tsx': 'CAMEL_CASE',
                    },
                ],
            },
        },
    )

export default filescheckRules
