
import type {
    JSLikeFileExtensions,
    MarkdownFileExtensions,
    PrettierFileExtensions,
} from './shared.js'
import type { LiteralUnion } from 'type-fest'

export type AllowedExtensions =
    | JSLikeFileExtensions
    | PrettierFileExtensions
    | MarkdownFileExtensions

const ensureTrailingDot = (value: string): string => {
    if (value.length === 0 || value.endsWith('.')) {
        return value
    }
    return `${value}.`
}

type FileExtensionHint = LiteralUnion<AllowedExtensions, string>
export const expandExtensions = (
    extensions: ReadonlyArray<FileExtensionHint>,
    basePattern: string = '',
): Array<string> => {
    const normalizedBasePattern = ensureTrailingDot(basePattern)
    return extensions.map((extension) => `${normalizedBasePattern}${extension}`)
}