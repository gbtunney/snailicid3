/**
 * Re-exports utility type guards from @snailicid3/types.
 * Local files import from this module so the guard implementations
 * live in one place (types package) and utils just adapts.
 */
export {
    tg as _tg,
} from '@snailicid3/types'

import { tg } from '@snailicid3/types'

export const {
    isTruthy,
    isFalsy,
    isNilOrEmpty,
    isNotNilOrEmpty,
    isEmptyString,
    isString,
    isNotString,
    isNumber,
    isNotNumber,
    isBigInt,
    isArray,
    isNonEmptyArray,
    isEmptyArray,
    isRegExp,
    isPlainObject,
    isNull,
    isNotNull,
    isUndefined,
    isNotUndefined,
    isNullish,
    isNotNullish,
    isNilLike,
    isNotNilLike,
    isPrimitive,
    isNotPrimitive,
    isInteger,
    isNotInteger,
    isEmptyObject,
    isNonEmptyObject,
    isError,
    isNotError,
} = tg
