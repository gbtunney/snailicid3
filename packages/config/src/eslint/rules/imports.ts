import { type Config, defineConfig } from '@eslint/config-helpers'
import { flatConfigs } from 'eslint-plugin-import-x'
import { configs as perfectionistConfigs } from 'eslint-plugin-perfectionist'
import { JSLIKE_FILE_EXTENSIONS } from '../../shared.js'
import { expandExtensions } from '../../utilities/extensions.js'

/**
 * Imports: module resolution, import/export ordering, unused import removal, and type import consistency. Uses
 * eslint-plugin-import-x for resolution rules and eslint-plugin-perfectionist for sorting.
 */
export const importRules = (): Array<Config> =>
    defineConfig(
        flatConfigs.recommended,
        // Temporarily disabled: requires eslint-import-resolver-typescript setup.
        //importPlugin.flatConfigs.typescript,
        perfectionistConfigs['recommended-natural'],
        {
            name: 'Imports: default rules',
            settings: {
                /**
                 * Unlike eslint-plugin-import, import-x has no default here, so export-map rules (namespace, named,
                 * default, export) parse the full source of every resolvable dependency and can exhaust the heap on
                 * large packages such as three.js.
                 */
                'import-x/ignore': ['node_modules'],
            },
            rules: {
                '@typescript-eslint/consistent-type-imports': [
                    'error',
                    { fixStyle: 'inline-type-imports', prefer: 'type-imports' },
                ],
                'import-x/no-named-as-default': 'off',
                //TODO find out why this is broke
                'import-x/no-unresolved': 'off',
                'import/extensions': ['error', 'ignorePackages'],
                'import/no-default-export': 'off',
                'import/no-duplicates': ['warn', { considerQueryString: true }],
                'import/no-unresolved': 'off',
                'no-unused-vars': 'off',
                'perfectionist/sort-exports': [
                    'error',
                    { order: 'asc', type: 'natural' },
                ],
                'perfectionist/sort-imports': [
                    'error',
                    {
                        groups: [
                            'external',
                            'builtin',
                            'internal',
                            'sibling',
                            'parent',
                            'index',
                        ],
                        newlinesBetween: 'ignore',
                        order: 'asc',
                        type: 'natural',
                    },
                ],
                'perfectionist/sort-named-exports': [
                    'error',
                    { order: 'asc', type: 'natural' },
                ],
                'perfectionist/sort-named-imports': [
                    'error',
                    { order: 'asc', type: 'natural' },
                ],
                'unused-imports/no-unused-imports': 'error',
            },
        },
        {
            files: [
                ...expandExtensions(JSLIKE_FILE_EXTENSIONS, '**/src/**/*.'),
            ],
            name: 'Imports: warn on default exports in src files',
            rules: {
                'import/prefer-default-export': 'warn',
            },
        },
    )
export default importRules
