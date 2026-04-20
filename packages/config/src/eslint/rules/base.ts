import { type Config, defineConfig } from '@eslint/config-helpers'
import pluginJs from '@eslint/js'
import { SHARED_FORMATTING_RULES } from '../../shared.js'

export const baseRules = (): Array<Config> =>
    defineConfig(
        pluginJs.configs.recommended,
        {
            name: 'Base: no-multiple-empty-lines',
            rules: {
                'no-multiple-empty-lines': [
                    'error',
                    { max: SHARED_FORMATTING_RULES.maxEmptyLines },
                ],
            },
        },
        {
            name: 'ESLint Comments: ERROR',
            rules: {
                'eslint-comments/no-aggregating-enable': 'error',
                'eslint-comments/no-duplicate-disable': 'error',
                'eslint-comments/no-unlimited-disable': 'error',
                'eslint-comments/no-unused-disable': 'error',
                'eslint-comments/no-unused-enable': 'error',
                'eslint-comments/no-use': [
                    'error',
                    {
                        allow: [
                            'eslint',
                            'eslint-disable',
                            'eslint-enable',
                            'eslint-disable-next-line',
                            'eslint-disable-line',
                        ],
                    },
                ],
            },
        },
    )
