import { type Config, defineConfig } from '@eslint/config-helpers'
import pluginJs from '@eslint/js'
import { SHARED_FORMATTING_RULES } from '../../shared.js'

export const baseRules = (): Array<Config> =>
    defineConfig(pluginJs.configs.recommended, {
        name: 'Base: no-multiple-empty-lines',
        rules: {
            'no-multiple-empty-lines': [
                'error',
                { max: SHARED_FORMATTING_RULES.maxEmptyLines },
            ],
        },
    })
