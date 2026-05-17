import type { NumericString, NumericStringKind } from './numeric.js'
import { numericPatterns } from './patterns.js'

const _cleanup = (str: string): string => str.replace(/_/g, '').trim()

export const parseBinary = (value: string): number => Number(value)
export const parseOctal = (value: string): number => Number(value)
export const parseHex = (value: string): number => parseInt(value, 16)
export const parseDecimal = (value: string): number => Number(value)
export const parseScientific = (value: string): number => Number(value)
export const parseExponential = (value: string): number => Number(value)
export const parseBigintLiteral = (value: string): bigint =>
    BigInt(value.replace(/[Nn]$/, ''))

export const numericFormats = {
    bigint: {
        base: 10,
        kind: 'bigint' as const,
        parse: parseBigintLiteral,
        regex: numericPatterns.bigint,
    },
    binary: {
        base: 2,
        kind: 'binary' as const,
        parse: parseBinary,
        regex: numericPatterns.binary,
    },
    decimal: {
        base: 10,
        kind: 'decimal' as const,
        parse: parseDecimal,
        regex: numericPatterns.decimal,
    },
    exponential: {
        base: 10,
        kind: 'exponential' as const,
        parse: parseExponential,
        regex: numericPatterns.exponential,
    },
    hex: {
        base: 16,
        kind: 'hex' as const,
        parse: parseHex,
        regex: numericPatterns.hex,
    },
    octal: {
        base: 8,
        kind: 'octal' as const,
        parse: parseOctal,
        regex: numericPatterns.octal,
    },
    scientific: {
        base: 10,
        kind: 'scientific' as const,
        parse: parseScientific,
        regex: numericPatterns.scientific,
    },
} as const

type FormatUtils = {
    [K in keyof typeof numericFormats]: {
        isValid: (
            v: string,
        ) => v is NumericString<K extends NumericStringKind ? K : never>
        parse: (v: string) => bigint | number
    }
}

export const numericFormatUtils = Object.fromEntries(
    (Object.keys(numericFormats) as Array<keyof typeof numericFormats>).map(
        (key) => {
            const meta = numericFormats[key]
            return [
                key,
                {
                    isValid: (value: string): boolean =>
                        meta.regex.test(value.trim()),
                    parse: (value: string): bigint | number =>
                        meta.parse(_cleanup(value.trim())),
                },
            ]
        },
    ),
) as FormatUtils
