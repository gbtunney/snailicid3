import {
    bigintNumber,
    binaryNumber,
    hexNumber,
    octalNumber,
    scientificNumber,
} from '../regexp/dictionary.js'

export const MASTER_NUMERIC_LITERAL =
    /^[+-]?(?:0b[01](?:_?[01])*|0o[0-7](?:_?[0-7])*|0x[0-9a-f](?:_?[0-9a-f])*|(?:\d(?:_?\d)*(?:\.\d(?:_?\d)*)?|\.\d(?:_?\d)*)(?:[eE][+-]?\d(?:_?\d)*)?|(?:\d(?:_?\d)*|0x[0-9a-f](?:_?[0-9a-f])*|0o[0-7](?:_?[0-7])*|0b[01](?:_?[01])*)n)$/i

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
