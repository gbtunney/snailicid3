import type { Config as PrettierConfig } from 'prettier'

const config: PrettierConfig = {
    plugins: ['prettier-plugin-sh'],
    semi: false,
    singleQuote: true,
    tabWidth: 4,
    trailingComma: 'all',
    printWidth: 100,
    endOfLine: 'lf',
    overrides: [
        {
            files: '.husky/*',
            options: {
                parser: 'sh',
            },
        },
        {
            files: '**/*.sh',
            options: {
                parser: 'sh',
            },
        },
        {
            files: '**/*.md',
            options: {
                printWidth: 110,
                proseWrap: 'always',
                tabWidth: 2,
            },
        },
        {
            files: '**/*.json',
            options: {
                tabWidth: 4,
            },
        },
    ],
}

export default config
