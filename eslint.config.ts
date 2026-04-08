/**
 * Root ESLint flat config — TypeScript source file.
 * Loaded via jiti (no compile step needed).
 * Run with: eslint --flag unstable_ts_config .
 */
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import storybook from 'eslint-plugin-storybook'
import tsEslint from 'typescript-eslint'
import url from 'node:url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

export default tsEslint.config(
    // ── ignores ────────────────────────────────────────────────
    {
        ignores: [
            '**/.history/**',
            '**/scratch/**',
            '**/examples/**',
            '**/*.map',
            '**/.venv/**',
            '**/venv/**',
            '**/__pycache__/**',
            '**/*.py',
            '**/*.{js,cjs,mjs}',
            '!eslint.config.js',
            '**/*.d.*',
            '**/storybook-static/**',
            '**/dist/**',
            '**/types/**',
            '**/node_modules/**',
        ],
    },

    // ── base typescript ────────────────────────────────────────
    ...tsEslint.configs.recommended,

    // ── global overrides ───────────────────────────────────────
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
        languageOptions: {
            parserOptions: {
                // NOTE: project: null disables type-aware linting globally.
                // Each package has its own tsconfig — type-aware rules would
                // require per-package parserOptions.project configuration.
                // Re-enable per-package when needed.
                project: null,
            },
        },
        rules: {
            'import/no-default-export': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'typeParameter',
                    format: ['PascalCase'],
                    custom: { regex: '^.{2,}$', match: true },
                },
            ],
        },
    },

    // ── disable type-checked rules on plain JS ─────────────────
    ...tsEslint.config({
        extends: [tsEslint.configs.disableTypeChecked],
        files: ['**/*.js', '**/*.d.*'],
    }),

    // ── React / TSX component files ────────────────────────────
    {
        files: ['**/*.tsx'],
        ...reactHooks.configs.flat.recommended,
        ...reactRefresh.configs.vite,
        rules: {
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'function',
                    format: ['PascalCase', 'camelCase'],
                },
            ],
        },
    },

    // ── React hooks (use*.ts / use*.tsx) ───────────────────────
    {
        files: ['**/use*.ts', '**/use*.tsx'],
        rules: {
            // hook files are camelCase even though they export React hooks
        },
    },

    // ── Storybook stories ──────────────────────────────────────
    ...tsEslint.config({
        files: ['**/*.stories.ts', '**/*.stories.tsx'],
        ...(Array.isArray(storybook.configs['flat/recommended'])
        ? storybook.configs['flat/recommended']
        : [storybook.configs['flat/recommended']]),

        rules: {
          
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'function',
                    format: ['PascalCase', 'camelCase'],
                },
            ],
        },
    }),
)
