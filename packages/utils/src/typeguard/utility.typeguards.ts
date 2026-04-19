export const {
    isArray,
    isBigInt,
    isEmptyArray,
    isEmptyObject,
    isEmptyString,
    isError,
    isFalsy,
    isInteger,
    isNilLike,
    isNilOrEmpty,
    isNonEmptyArray,
    isNonEmptyObject,
    isNotError,
    isNotInteger,
    isNotNilLike,
    isNotNilOrEmpty,
    isNotNull,
    isNotNullish,
    isNotNumber,
    isNotPrimitive,
    isNotString,
    isNotUndefined,
    isNull,
    isNullish,
    isNumber,
    isPlainObject,
    isPrimitive,
    isRegExp,
    isString,
    isTruthy,
    isUndefined,
} = tg

import { tg } from '@snailicid3/types'

/**
 * Re-exports utility type guards from @snailicid3/types.
 * Local files import from this module so the guard implementations
 * live in one place (types package) and utils just adapts.
 */
export {
    tg as _tg,
} from '@snailicid3/types'
