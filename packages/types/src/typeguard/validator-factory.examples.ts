import { isInteger as raIsInteger } from 'ramda-adjunct'
import type { AsBooleanFn } from './../types/utility.js'
import { factoryTypeGuard, factoryValidator } from './validator-factory.js'
import type { ValidatorReturn } from './validator-factory.js'
/** Numeric string regexes kept local so this example has no cross-package import dependency. */
const scientificNumber =
    /^[+-]?(?:\d(?:_?\d)*(?:\.\d(?:_?\d)*)?|\.\d(?:_?\d)*)(?:e[+-]?\d(?:_?\d)*)?$/i
const hexNumber = /^[+-]?0x[\da-f]+$/i
const binaryNumber = /^[+-]?0b[01]+$/i
const bigintNumber = /^[+-]?(?:\d(?:_?\d)*|0x[\da-f]+|0b[01]+)n$/i

/** String type guards backed by local regex constants */
const isScientificString = (value: unknown): value is string =>
    typeof value === 'string' && scientificNumber.test(value)

const isHexString = (value: unknown): value is string =>
    typeof value === 'string' && hexNumber.test(value)

const isBinaryString = (value: unknown): value is string =>
    typeof value === 'string' && binaryNumber.test(value)

const isBigIntLiteralString = (value: unknown): value is string =>
    typeof value === 'string' && bigintNumber.test(value)

const isMatchStringRegExp = (value: string, exp: RegExp): value is string =>
    typeof value === 'string' && exp.test(value)

const testme = (value: unknown): boolean =>
    typeof value === 'string' && value.length > 5

// boolean predicate example
const isTestObj = factoryValidator(testme, 'matchRegExp')
void isTestObj

// type-guard example (explicit type for isolatedModules friendliness)
const isMatchRegExpObj: ValidatorReturn<
    typeof isMatchStringRegExp,
    'matchRegExp'
> = factoryValidator(isMatchStringRegExp, 'matchRegExp')

// Use AsBooleanFn to expose callable predicate signatures
export const isMatchRegExp: typeof isMatchStringRegExp =
    isMatchRegExpObj.isMatchRegExp

export const isNotMatchRegExp: AsBooleanFn<typeof isMatchStringRegExp> =
    isMatchRegExpObj.isNotMatchRegExp

// @ts-expect-error number should error
const myResult = isMatchRegExpObj.isMatchRegExp(3, /hi/)
void myResult

const example1 = factoryValidator(isScientificString, 'scientificNumber')

export const isScientificNumber: typeof isScientificString =
    example1.isScientificNumber

export const isNotScientificNumber: AsBooleanFn<typeof isScientificString> =
    example1.isNotScientificNumber

const hexNumberValidators = factoryValidator(isHexString, 'hexNumber')

export const isHexNumber: typeof isHexString = hexNumberValidators.isHexNumber

export const isNotHexNumber: AsBooleanFn<typeof isHexString> =
    hexNumberValidators.isNotHexNumber

const binaryNumberValidators = factoryValidator(isBinaryString, 'binaryNumber')

export const isBinaryNumber: typeof isBinaryString =
    binaryNumberValidators.isBinaryNumber

export const isNotBinaryNumber: AsBooleanFn<typeof isBinaryString> =
    binaryNumberValidators.isNotBinaryNumber

const bigIntLiteralValidators = factoryValidator(
    isBigIntLiteralString,
    'bigIntLiteral',
)

export const isBigIntLiteral: typeof isBigIntLiteralString =
    bigIntLiteralValidators.isBigIntLiteral

export const isNotBigIntLiteral: AsBooleanFn<typeof isBigIntLiteralString> =
    bigIntLiteralValidators.isNotBigIntLiteral

const integerValidators = factoryTypeGuard<
    number,
    'integer',
    typeof raIsInteger
>(raIsInteger, 'integer')

export const isInteger: (
    inputValue: Parameters<typeof raIsInteger>[0],
) => inputValue is number = integerValidators.isInteger

export const iisInteger: typeof isInteger = isInteger

export const isNotInteger: AsBooleanFn<typeof raIsInteger> =
    integerValidators.isNotInteger
