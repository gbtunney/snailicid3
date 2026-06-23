/**
 * Prettier Configuration
 *
 * @see [Prettier - Opinionated Code Formatter](https://prettier.io/)
 */
import { type Config, type Options } from 'prettier'
import type { Options as JsDocOptions } from 'prettier-plugin-jsdoc'
import type { IterableElement, Merge } from 'type-fest'
import { getScaledWidth, SHARED_FORMATTING_RULES } from '../shared.js'

export type PrettierConfig = Merge<
    Merge<Config, PrettierOptions>,
    {
        overrides: PrettierOverrides
    }
>
export type PrettierOptions = JsDocOptions & Options

export type PrettierOverrides = Array<
    Merge<IterableElement<Config['overrides']>, { options: PrettierOptions }>
>

export const getDefaultOptions = (): PrettierOptions => {
    return {
        bracketSameLine: true,

        jsdocCapitalizeDescription: false,
        /** JS Doc */
        jsdocPrintWidth: getScaledWidth('comments'),
        //PackageIgnoreSort: ["scripts"],
        //SHARED_FORMATTING_RULES.tabWidth,
        /**
         * TODO reenabled or remove packageSortOrder: [ "name", "version", "private", "description", "scripts", "main",
         * "module", "types", "dependencies", "devDependencies", "type", "exports", "author", "license" ],
         */
        printWidth: getScaledWidth('code'),
        proseWrap: 'never',

        quoteProps: 'consistent',
        semi: false,
        singleQuote: true,
        tabWidth: 4,
    } as const
}

export const getDefaultOverrides: () => PrettierOverrides = () => [
    /** Override for markdown files only */
    {
        files: '**/*.md',
        options: {
            printWidth: getScaledWidth('markdown'),
            proseWrap: 'always',
            tabWidth: SHARED_FORMATTING_RULES.markdownTabWidth,
        },
    },
    /* TODO: implement this {
        files: ['.yml', '.yaml'],
        options: {
        printWidth: getScaledWidth('markdown'),
        proseWrap: 'always',
        },
    },*/
    {
        files: '.husky/*',
        options: {
            parser: 'sh',
        },
    },
]
