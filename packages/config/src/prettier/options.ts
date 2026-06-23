/**
 * Prettier Configuration
 *
 * @see [Prettier - Opinionated Code Formatter](https://prettier.io/)
 */
import type { Config, Options } from 'prettier'
import type { Options as JsDocOptions } from 'prettier-plugin-jsdoc'
import type { IterableElement, LiteralUnion, Simplify } from 'type-fest'
import { getScaledWidth, SHARED_FORMATTING_RULES } from '../shared.js'

export type PrettierConfigBase = Simplify<
    PrettierOptions & {
        overrides: PrettierOverrides
    }
>

/** Flat Prettier options only. */
export type PrettierOptions = Simplify<
    Omit<StripIndexSignature<JsDocOptions & Options>, ReservedPrettierOptionKey>
>

export type PrettierOverride = Simplify<
    Omit<RawPrettierOverride, 'excludeFiles' | 'files' | 'options'> & {
        excludeFiles?: PrettierOverrideFiles
        files: PrettierOverrideFiles
        options: PrettierOptions
    }
>

export type PrettierOverrideFilePattern = LiteralUnion<
    | '**/*.md'
    | '**/*.{js,jsx,ts,tsx}'
    | '**/*.{json,jsonc}'
    | '**/*.{yml,yaml}'
    | '.husky/*',
    string
>

export type PrettierOverrideFiles =
    | Array<PrettierOverrideFilePattern>
    | PrettierOverrideFilePattern

export type PrettierOverrides = Array<PrettierOverride>

/**
 * Config-wrapper keys that should not appear inside flat Prettier option objects.
 *
 * Top-level Prettier options are flat. Override `options` are nested under each override item.
 */
export type ReservedPrettierOptionKey =
    | 'exclude'
    | 'excludeFiles'
    | 'files'
    | 'options'
    | 'overrides'
    | 'plugins'

/** Removes loose index signatures so editor hints show known option keys instead of accepting every random string key. */
export type StripIndexSignature<Type> = {
    [Key in keyof Type as string extends Key
        ? never
        : number extends Key
          ? never
          : symbol extends Key
            ? never
            : Key]: Type[Key]
}

type RawPrettierOverride = StripIndexSignature<
    IterableElement<NonNullable<Config['overrides']>>
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
