import { describe, expect, test } from 'vitest'

import {
    clampRange,
    mapRange,
    roundToDecimals,
    roundToDecimalsNoCarry,
    wrapRange,
} from './range.js'

describe('numeric range utilities', () => {
    test('maps between ranges', () => {
        expect(mapRange(0.5, [0, 1], [0, 100])).toBe(50)
    })

    test('clamps and wraps values', () => {
        expect(clampRange(12, [0, 10])).toBe(10)
        expect(wrapRange(12, [0, 10])).toBe(2)
        expect(wrapRange(-1, [0, 10])).toBe(9)
        expect(() => wrapRange(1, [2, 2])).toThrow(RangeError)
    })

    test('rounds or truncates decimal places', () => {
        expect(roundToDecimals(1.236, 2)).toBe(1.24)
        expect(roundToDecimalsNoCarry(1.239, 2)).toBe(1.23)
        expect(roundToDecimals(Number.POSITIVE_INFINITY, 2)).toBe(
            Number.POSITIVE_INFINITY,
        )
    })
})
