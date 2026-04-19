import { numericFormats } from './dictionary.js'
import { numericPatterns } from './patterns.js'

export const cleanupNumericSeparators = (str: string): string =>
    str.replace(/_/g, '').trim()

export function parseMaster(rawValue: string): number | bigint | undefined {
    const trimmed = rawValue.trim()
    // Validate underscore placement against the raw trimmed value BEFORE stripping
    if (!numericPatterns.master.test(trimmed)) return undefined
    // Strip underscores only after structural validation passes
    const value = cleanupNumericSeparators(trimmed)

    let detectedKind: keyof typeof numericFormats
    if (/^[-+]?0b/i.test(trimmed)) detectedKind = 'binary'
    else if (/^[-+]?0o/i.test(trimmed)) detectedKind = 'octal'
    else if (/^[-+]?0x/i.test(trimmed)) detectedKind = 'hex'
    else if (/[eE][+-]?\d/.test(trimmed))
        detectedKind = trimmed.includes('.') ? 'scientific' : 'exponential'
    else if (/n$/i.test(trimmed)) detectedKind = 'bigint'
    else detectedKind = 'decimal'

    return numericFormats[detectedKind].parse(value)
}

export const parseNumeric = parseMaster
