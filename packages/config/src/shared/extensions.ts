import type { ArrayValues, Spread } from 'type-fest'

export const JS_FILE_EXTENSIONS = ['js', 'mjs', 'cjs', 'jsx'] as const
export const TS_FILE_EXTENSIONS = ['ts', 'mts', 'cts', 'tsx'] as const
export const JSLIKE_FILE_EXTENSIONS: Spread<
    typeof JS_FILE_EXTENSIONS,
    typeof TS_FILE_EXTENSIONS
> = [...JS_FILE_EXTENSIONS, ...TS_FILE_EXTENSIONS] as const

/** All file extensions to format */
export const PRETTIER_FILE_EXTENSIONS = [
    'json',
    'xml',
    'php',
    'html',
    'css',
    'md',
    'sh',
    'yaml',
    'yml',
    'graphql',
] as const

export const MARKDOWN_FILE_EXTENSIONS = ['md', 'markdown'] as const

export type JSFileExtensions = ArrayValues<typeof JS_FILE_EXTENSIONS>
export type JSLikeFileExtensions = ArrayValues<typeof JSLIKE_FILE_EXTENSIONS>
export type MarkdownFileExtensions = ArrayValues<
    typeof MARKDOWN_FILE_EXTENSIONS
>
export type PrettierFileExtensions = ArrayValues<
    typeof PRETTIER_FILE_EXTENSIONS
>
export type TSFileExtensions = ArrayValues<typeof TS_FILE_EXTENSIONS>
