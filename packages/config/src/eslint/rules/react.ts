import { Config,defineConfig } from "@eslint/config-helpers";
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

/** TODO: add real react rules not just the vite ones */
export const reactRules :() => Array<Config>= ()=> defineConfig([
	{
 files: ['**/main.tsx'],
        ...reactHooks.configs.flat.recommended,
                ...reactRefresh.configs.vite,
                 rules: {
            // Allow PascalCase for .tsx component files
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    format: ['PascalCase', 'camelCase'],
                    selector: 'function',
                },
            ],
            'filenames-simple/naming-convention': [
                'error',
                { rule: 'PascalCase' },
            ],
            'sort/destructuring-properties': [
                'error',
                { caseSensitive: false, natural: true },
            ],
        },
    },
    // Hook filenames like useAudioRecorder.ts should be camelCase
	 {
        files: ['**/use*.ts', '**/use*.tsx'],
        rules: {
            'filenames-simple/naming-convention': [
                'error',
                { rule: 'camelCase' },
            ],
        },
    },
    //allow lowercase for files called main
        {
            files: ['**/main.tsx'],
            ...reactHooks.configs.flat.recommended,
            ...reactRefresh.configs.vite,
            rules: {
                'filenames-simple/naming-convention': [
                    'error',
                    { rule: 'camelCase' },
                ],
            },
        },

        //  'react-hooks/exhaustive-deps': 'error',
       /*     'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],*/
])