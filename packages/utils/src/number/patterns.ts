import {
    bigintNumber,
    binaryNumber,
    hexNumber,
    octalNumber,
    scientificNumber,
} from '../regexp/dictionary.js'

export const MASTER_NUMERIC_LITERAL =
    /^[+-]?(?:0b[01](?:_?[01])*|0o[0-7](?:_?[0-7])*|0x[\da-f](?:_?[\da-f])*|(?:\d(?:_?\d)*(?:\.\d(?:_?\d)*)?|\.\d(?:_?\d)*)(?:e[+-]?\d(?:_?\d)*)?|(?:\d(?:_?\d)*|0x[\da-f](?:_?[\da-f])*|0o[0-7](?:_?[0-7])*|0b[01](?:_?[01])*)n)$/i

export const numericPatterns = {
    bigint: bigintNumber,
    binary: binaryNumber,
    decimal: scientificNumber,
    exponential: scientificNumber,
    hex: hexNumber,
    master: MASTER_NUMERIC_LITERAL,
    octal: octalNumber,
    scientific: scientificNumber,
} as const
