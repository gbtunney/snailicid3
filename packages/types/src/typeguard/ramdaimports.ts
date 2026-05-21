import {
    isArray,
    isBigInt,
    isBoolean,
    isEmptyArray,
    isEmptyString,
    isFalsy,
    isInteger,
    isNilOrEmpty,
    isNonEmptyArray,
    isNotArray,
    isNotInteger,
    isNotNil,
    isNotNilOrEmpty,
    isNotNull,
    isNotPrimitive,
    isNotString,
    isNull,
    isNumber,
    isObjectLike,
    isPlainObject,
    isPrimitive,
    isRegExp,
    isString,
    isTruthy,
    isValidNumber,
} from 'ramda-adjunct'

export const RA: {
    isArray: typeof isArray
    isBigInt: typeof isBigInt
    isBoolean: typeof isBoolean
    isEmptyArray: typeof isEmptyArray
    isEmptyString: typeof isEmptyString
    isFalsy: typeof isFalsy
    isInteger: typeof isInteger
    isNilOrEmpty: typeof isNilOrEmpty
    isNonEmptyArray: typeof isNonEmptyArray
    isNotArray: typeof isNotArray
    isNotInteger: typeof isNotInteger
    isNotNil: typeof isNotNil
    isNotNilOrEmpty: typeof isNotNilOrEmpty
    isNotNull: typeof isNotNull
    isNotPrimitive: typeof isNotPrimitive
    isNotString: typeof isNotString
    isNull: typeof isNull
    isNumber: typeof isNumber
    isObjectLike: typeof isObjectLike
    isPlainObject: typeof isPlainObject
    isPrimitive: typeof isPrimitive
    isRegExp: typeof isRegExp
    isString: typeof isString
    isTruthy: typeof isTruthy
    isValidNumber: typeof isValidNumber
} = {
    isArray: isArray,
    isBigInt: isBigInt,
    isBoolean: isBoolean,
    isEmptyArray: isEmptyArray,
    isEmptyString: isEmptyString,
    isFalsy: isFalsy,
    isInteger: isInteger,
    isNilOrEmpty: isNilOrEmpty,
    isNonEmptyArray: isNonEmptyArray,
    isNotArray: isNotArray,
    isNotInteger: isNotInteger,
    isNotNil: isNotNil,
    isNotNilOrEmpty: isNotNilOrEmpty,
    isNotNull: isNotNull,
    isNotPrimitive: isNotPrimitive,
    isNotString: isNotString,
    isNull: isNull,
    isNumber: isNumber,
    isObjectLike: isObjectLike,
    isPlainObject: isPlainObject,
    isPrimitive: isPrimitive,
    isRegExp: isRegExp,
    isString: isString,
    isTruthy: isTruthy,
    isValidNumber: isValidNumber,
}
