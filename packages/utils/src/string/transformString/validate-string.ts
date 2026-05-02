import { isNotUndefined, isRegExp, isString } from 'ramda-adjunct'
import {
    getRegExpEndOfString,
    getRegExpStartOfString,
} from '../../regexp/string-to-regexp.js'

/** Interface for validation object. */
export type IValidateObj = {
    pattern: RegExp | string
    validate_op?: ValidateOperation
    value: string
}
export type ValidateFunc = (value: string, pattern: string) => boolean

export type ValidateOperation =
    | 'contains'
    | 'endsWith'
    | 'eq'
    | 'includes'
    | 'startsWith'
    | ValidateFunc

/**
 * Checks if the string starts with the given pattern
 *
 * @category Validators
 * @see {@link endsWith}
 */
export const startsWith: ValidateFunc = (
    value: string,
    pattern: string,
): boolean =>
    getRegExpStartOfString(pattern, ['global', 'multiline']).test(value)

/**
 * Checks if the string ends with the given pattern.
 *
 * @category Validators
 * @see {@link startsWith}
 */
export const endsWith: ValidateFunc = (
    value: string,
    pattern: string,
): boolean => getRegExpEndOfString(pattern, ['global', 'multiline']).test(value)

/**
 * Checks if the string includes the given string.
 *
 * @category Validators
 */
export const includes: ValidateFunc = (value, pattern) =>
    new RegExp(pattern, 'gm').test(value)

/**
 * Checks if the string is === the given pattern.
 *
 * @category Validators
 */
export const eq: ValidateFunc = (value, pattern) => value === pattern

/**
 * Checks if the string contains the given string.
 *
 * @category Validators
 */
export const contains: ValidateFunc = includes

/**
 * Checks if the string matches the given RegExp pattern.
 *
 * @category Validators
 */
export const match = (value: string, pattern: RegExp): boolean =>
    pattern.test(value)

/**
 * Validates a string based on the provided pattern and validation operation.
 *
 * @category Validators
 * @see {@link validateStringBatch}
 */
export const validateString = (
    value: string,
    pattern: RegExp | string,
    validate_op: ValidateOperation = 'eq',
): boolean => {
    if (isRegExp(pattern)) return match(value, pattern as RegExp)
    return (validate_op as ValidateFunc)(value, pattern as string)
}

/**
 * Validates a batch of strings or validation objects based on the provided operation.
 *
 * @category Validators
 * @see {@link validateString}
 */
export const validateStringBatch = (
    value: Array<IValidateObj> | string,
    validateObjects?: Array<Omit<IValidateObj, 'value'>>,
    operation: 'every' | 'some' = 'some',
): boolean => {
    const validateArr: Array<IValidateObj> =
        isString(value) && isNotUndefined(validateObjects)
            ? (validateObjects as Array<Omit<IValidateObj, 'value'>>).map(
                  (obj) => ({ ...obj, value }),
              )
            : (value as Array<IValidateObj>)

    const _operation =
        /* eslint  @typescript-eslint/unbound-method: "warn" */
        operation === 'some' ? validateArr.some : validateArr.every
    return _operation((obj) =>
        validateString(obj.value, obj.pattern, obj.validate_op),
    )
}
