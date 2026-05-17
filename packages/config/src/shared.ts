import micromatch from 'micromatch'
import type { Config, Options as PrettierOptions } from 'prettier'
import type { ArrayValues, Merge } from 'type-fest'

export const JS_FILE_EXTENSIONS = ['js', 'mjs', 'cjs', 'jsx'] as const
export const TS_FILE_EXTENSIONS = ['ts', 'mts', 'cts', 'tsx'] as const
export const JSLIKE_FILE_EXTENSIONS = [
    ...JS_FILE_EXTENSIONS,
    ...TS_FILE_EXTENSIONS,
] as const
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

export type JSFileExtensions = ArrayValues<typeof JS_FILE_EXTENSIONS>
export type JSLikeFileExtensions = ArrayValues<typeof JSLIKE_FILE_EXTENSIONS>
export type PrettierFileExtensions = ArrayValues<
    typeof PRETTIER_FILE_EXTENSIONS
>
export type TSFileExtensions = ArrayValues<typeof TS_FILE_EXTENSIONS>

export const MARKDOWN_FILE_EXTENSIONS = ['md', 'markdown'] as const
export type MarkdownFileExtensions = ArrayValues<
    typeof MARKDOWN_FILE_EXTENSIONS
>

const PRETTIER_WIDTH_BASE: Config['tabWidth'] = 100

const PRETTIER_WIDTH_SCALE = {
    code: 0.8,
    comments: 1.2,
    markdown: 1.0,
} as const

export const SHARED_FORMATTING_RULES: Merge<
    PrettierOptions,
    {
        markdownTabWidth: number
        maxEmptyLines: number
    }
> = {
    markdownTabWidth: 2,
    maxEmptyLines: 1,
    tabWidth: 4, //todo: use in "no-multiple-empty-lines" //MD012/no-multiple-blanks
} as const

export const getScaledWidth = (
    scaleKey: keyof typeof PRETTIER_WIDTH_SCALE,
    baseWidth: number = PRETTIER_WIDTH_BASE,
    scaleMap: typeof PRETTIER_WIDTH_SCALE = PRETTIER_WIDTH_SCALE,
): number => {
    return Math.floor(scaleMap[scaleKey] * baseWidth)
}

/** Removes a file from list if it matches a glob pattern. Only supports simple globs like *.md */

export const filterFileArrByGlob = (
    files: ReadonlyArray<string>,
    globs: ReadonlyArray<string>,
): Array<string> => {
    //micromatch([...files], globs)
    console.log(
        'COMPARING ',
        files,
        micromatch.not([...files], globs),
        'next ',
        micromatch.not([...files], ['*.api.md']),
        'AFTER',
        micromatch.not([...files], ['**/*.api.md']),
    )
    return micromatch.not([...files], globs)
}
