import { ensureArray, isString, replaceAll } from 'ramda-adjunct'

import type {
    BaseValue,
    BatchBaseValue,
    Pattern,
    ReplaceCharacters,
} from './type.js'

const replaceCharactersSinglePattern = ({
    pattern,
    replacement,
    value,
}: BaseValue &
    ReplaceCharacters & {
        pattern: Pattern
    }): string => replaceAll(pattern, replacement, value)

/**
 * @category Replace Characters
 * @see {@link batchReplaceAll}
 */
export const replaceAllCharacters = ({
    pattern,
    replacement,
    value,
}: BaseValue &
    ReplaceCharacters & {
        pattern: Array<Pattern> | Pattern
    }): string => {
    return ensureArray(pattern).reduce<typeof value>(
        (accumulator: string, _pattern) =>
            replaceCharactersSinglePattern({
                pattern: _pattern,
                replacement,
                value: accumulator,
            }),
        value,
    )
}
/**
 * @category Replace Characters
 * @see {@link replaceAllCharacters}
 */
export const batchReplaceAll = ({
    pattern,
    replacement,
    value,
}: BatchBaseValue &
    ReplaceCharacters & {
        pattern: Array<Pattern> | Pattern
    }): Array<string> | string => {
    /** Already an array */
    const _value = isString(value) ? ensureArray(value) : value

    const result = _value.map((single_value) => {
        return replaceAllCharacters({
            pattern,
            replacement,
            value: single_value,
        })
    })
    return isString(value) && result.length > 0 ? result[0] : result
}
export default replaceAllCharacters
