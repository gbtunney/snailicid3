import type { Config, Options as PrettierOptions } from 'prettier'
import type { Merge } from 'type-fest'

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
    tabWidth: 4, //Todo: use in "no-multiple-empty-lines" //MD012/no-multiple-blanks
} as const

export const getScaledWidth = (
    scaleKey: keyof typeof PRETTIER_WIDTH_SCALE,
    baseWidth: number = PRETTIER_WIDTH_BASE,
    scaleMap: typeof PRETTIER_WIDTH_SCALE = PRETTIER_WIDTH_SCALE,
): number => {
    return Math.floor(scaleMap[scaleKey] * baseWidth)
}
