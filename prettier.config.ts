import { merge, Prettier } from '@snailicid3/config'
import type { Config as PrettierConfig } from 'prettier'

const overrides: PrettierConfig = {
    overrides: [
        {
            files: '**/*.md',
            options: {
                printWidth: 110,
                proseWrap: 'always',
            },
        },
    ],

    plugins: ['@prettier/plugin-xml'],
}

const default_config: PrettierConfig = Prettier.config
const config: PrettierConfig = merge(default_config, overrides)
export default config
