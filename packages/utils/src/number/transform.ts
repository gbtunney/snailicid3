import type { Integer } from 'type-fest'
import { parseMaster } from './master.js'
import type { Numeric, PossibleNumeric } from './numeric.js'
import { parseStringToInteger, parseToFloat } from './parse.js'
import { isPossibleNumeric, isStringNumeric } from './validators.js'
import { removeAllNewlines } from '../string/string-utils.js'
import {
    isBigInt,
    isNumber,
    isString as tgIsString,
} from '../typeguard/utility.typeguards.js'

/**
 * Convert a string to a numeric value.
 *
 * StrictChars=true (default): validates the string shape then delegates to parseMaster, which handles decimal,
 * scientific, exponential, hex, octal, binary, and bigint formats including numeric separators (underscores).
 *
 * StrictChars=false (loose): strips letters and symbols first, then parseFloat — useful for values like '100px'.
 *
 * @group Transform
 */
export const toStringNumeric = <Type extends string>(
    value: Type,
    strictChars: boolean = true,
): Numeric | undefined => {
    if (strictChars) {
        const trimmed = value.trim()
        if (!isStringNumeric(trimmed)) return undefined
        return parseMaster(trimmed) // ParseMaster validates then strips underscores internally
    }
    if (isStringNumeric(value, false)) {
        const stripped = removeAllNewlines(value).replace(
            /[!#$%&,?@A-Za-z]/g,
            '',
        )
        if (stripped.length > 0) return parseFloat(stripped)
    }
    return undefined
}

/**
 * Convert a value to a valid number type.
 *
 * @group Transform
 * See: parseToNumeric, parseStringToInteger
 */
export const toNumeric = <Type extends PossibleNumeric>(
    value: Type,
): Numeric | undefined => {
    if (isPossibleNumeric<Type>(value)) {
        if (isBigInt(value)) return value
        else if (isNumber(value)) return value
        else if (tgIsString(value) && isStringNumeric(value)) {
            return toStringNumeric(value)
        }
    }
    return undefined
}

/**
 * Converts a valid number to a float.
 *
 * @group Transform
 */
export const numericToFloat = <Type extends Numeric>(
    value: Type,
): Numeric | undefined => parseToFloat<Type>(value)

/**
 * Converts an integer number to an exact Integer using parseInt (i.e. 12.000 is allowed but not 12.001).
 *
 * @example
 *     const number_to_test_int = 22.000
 *     numericToInteger<typeof number_to_test_int, true>(number_to_test_int)
 *     => 22
 *
 * @group Transform
 */
export const numericToInteger = <Type extends Numeric, Strict = false>(
    value: Strict extends true ? Integer<Type> : Type,
): Numeric | undefined => {
    const str = tgIsString(value) ? value : value.toString()
    return parseStringToInteger(str)
}
