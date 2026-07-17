import type { LiteralUnion } from 'type-fest'
import type {
    JSLikeFileExtensions,
    MarkdownFileExtensions,
    PrettierFileExtensions,
} from '../shared.js'

export type AllowedExtensions =
    JSLikeFileExtensions | MarkdownFileExtensions | PrettierFileExtensions

const ensureTrailingDot = (value: string): string => {
    if (value.length === 0 || value.endsWith('.')) {
        return value
    }
    return `${value}.`
}

export type FileExtensionHint = LiteralUnion<AllowedExtensions, string>
/**
 * Expands a list of file extensions by appending them to a normalized base pattern.
 *
 * @example
 *     const extensions = ['js', 'ts']
 *     const result = expandExtensions(extensions, 'src/')
 *     //result: ['src/.js', 'src/.ts']
 */

export const expandExtensions = (
    /** An string array of file extensions to expand. */
    extensions: ReadonlyArray<FileExtensionHint>,
    /**
     * A base pattern to prepend to each extension. If provided, it ensures the base pattern ends with a dot. Default is
     * `''`
     */
    basePattern: string = '',
): Array<string> => {
    const normalizedBasePattern = ensureTrailingDot(basePattern)
    return extensions.map((extension) => `${normalizedBasePattern}${extension}`)
}
