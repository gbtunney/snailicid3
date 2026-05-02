import { type Config, defineConfig } from '@eslint/config-helpers'

/**
 * Safety: guards against abusive or unsafe ESLint directive comments — prevents silencing the linter without
 * justification
 */
export const safetyRules = (): Array<Config> =>
    defineConfig({
        name: 'Safety: ESLint directive guards',
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
    })
