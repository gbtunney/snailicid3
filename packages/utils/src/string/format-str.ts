import { vsprintf } from 'sprintf-js'
import z from 'zod'

import { ensureArray } from '../zod_helpers/schemas.js'

/**
 * Formats a string by replacing placeholders with provided arguments. This function utilizes the `vsprintf` method from
 * the `format` library to apply sprintf-style formatting to the input string using the provided arguments. The
 * arguments can be a single string or an array of strings, which are validated and converted to an array if necessary
 * using a Zod schema.
 *
 * @category Replace
 * @category Format
 */
export const formatString = (
    value: string,
    args: string | Array<string>,
): string => {
    const _vars = ensureArray(z.string()).parse(args)
    return vsprintf(value, _vars)
}
