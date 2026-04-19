import { factoryValidator } from './validator-factory.js'

/** Numeric string regexes kept local so this example has no cross-package import dependency. */
const scientificNumber =
    /^[+-]?(?:\d(?:_?\d)*(?:\.\d(?:_?\d)*)?|\.\d(?:_?\d)*)(?:e[+-]?\d(?:_?\d)*)?$/i
const hexNumber = /^[+-]?0x[0-9a-f]+$/i
const binaryNumber = /^[+-]?0b[01]+$/i
const bigintNumber = /^[+-]?(?:\d(?:_?\d)*|0x[0-9a-f]+|0b[01]+)n$/i

/** String type guards backed by local regex constants */
const isScientificString = (value: unknown): value is string =>
    typeof value === 'string' && scientificNumber.test(value)

const isHexString = (value: unknown): value is string =>
    typeof value === 'string' && hexNumber.test(value)

const isBinaryString = (value: unknown): value is string =>
    typeof value === 'string' && binaryNumber.test(value)

const isBigIntLiteralString = (value: unknown): value is string =>
    typeof value === 'string' && bigintNumber.test(value)

export const { isScientificNumber, isNotScientificNumber } = factoryValidator(
    isScientificString,
    'scientificNumber',
)

export const { isHexNumber, isNotHexNumber } = factoryValidator(
    isHexString,
    'hexNumber',
)

export const { isBinaryNumber, isNotBinaryNumber } = factoryValidator(
    isBinaryString,
    'binaryNumber',
)

export const { isBigIntLiteral, isNotBigIntLiteral } = factoryValidator(
    isBigIntLiteralString,
    'bigIntLiteral',
)
