import { isEmpty } from 'ramda'

import { batchTrimCharacters, trimCharacters } from './trim-characters.js'
import type { BatchBaseValue, TrimCharacters } from './type.js'
import { TRIM_CHARS_DEFAULT } from '../../regexp/dictionary.js'
import {
    isArray,
    isNotUndefined,
    isString,
} from '../../typeguard/utility.typeguards.js'

/** Todo: fix these mangled chars */
export const transformExplodeArray = function ({
    delimiter = ',',
    prefix,
    trim,
    value,
}: BatchBaseValue & {
    delimiter?: RegExp | string
    prefix?: string | undefined
    trim?: (TrimCharacters & { pattern: Array<string> | string }) | undefined
}): Array<string> | string {
    if (isEmpty(value)) return []
    //If it is an array already,delimiter is disregarded & array is just cleaned & prefixed.
    //the only case for delimiter being undefined is if value as an array
    let result: Array<string> = isArray<Array<string>>(value)
        ? value
        : isString(value) && isNotUndefined<RegExp | string>(delimiter)
          ? value.split(delimiter)
          : [value]

    if (isNotUndefined<TrimCharacters>(trim)) {
        const patternTrim = trim

        const newObj: BatchBaseValue &
            TrimCharacters & {
                pattern: Array<string> | string
            } = {
            value: result,
            ...trim,
        }
        result = batchTrimCharacters(newObj).filter((_str) =>
            _str.length > 2 ? true : false,
        )
    }

    if (isNotUndefined<string>(prefix)) {
        const cleaned_prefix = trimCharacters({
            pattern: TRIM_CHARS_DEFAULT,
            value: prefix,
        })
        result = result.map((_str) => `${cleaned_prefix}${_str}`)
    }
    return result.length === 1 && isNotUndefined<string>(result[0])
        ? result[0]
        : result
}

/** Default split by css class */
export const DEFAULT_EXPLODE_REGEX = new RegExp(/[ ,]/g)

/** This splits a string of windicss classes.? */
export const explodeCSSClassString = ({
    delimiter = DEFAULT_EXPLODE_REGEX,
    prefix,
    trim = { pattern: TRIM_CHARS_DEFAULT },
    value,
}: Parameters<typeof transformExplodeArray>[0]): Array<string> | string =>
    transformExplodeArray({ delimiter, prefix, trim, value })

export default transformExplodeArray
