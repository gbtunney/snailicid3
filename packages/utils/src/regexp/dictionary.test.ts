import { describe, expect, test } from 'vitest'
import {
    bigintNumber,
    binaryNumber,
    hexNumber,
    scientificNumber,
} from './dictionary.js'

describe('regexp/dictionary', () => {
    describe('scientificNumber', () => {
        test.each([
            '1',
            '1.0',
            '.5',
            '1e3',
            '1e+3',
            '1e-3',
            '7.123e01',
            '0e0',
            '6.02e23',
            '1.0e+0',
            '3.4028236692093846346e+38',
            '8e5',
            // Underscores allowed
            '1_000',
            '1_000.0_0',
            '.1_0',
            '1.2_3',
            '1e1_0',
            '7_123.456e-1_2',
            '+1_000.5e+1_0',
            '-.9_9e-0_2',
        ])('valid: %s', (str) => {
            expect(scientificNumber.test(str)).toBe(true)
        })

        test.each([
            'e10',
            '1e',
            '1e+',
            '1e-',
            '1ee10',
            '1e--10',
            '+e10',
            '-e10',
            // Bad underscores
            '1__0',
            '1._0',
            '1_.0',
            '1e_2',
            '1e2_',
            '_1',
            '1_',
            '._1',
            '2._2',
            '00.', // Trailing dot without fraction
        ])('invalid: %s', (str) => {
            expect(scientificNumber.test(str)).toBe(false)
        })
    })

    describe('hexNumber', () => {
        test.each([
            '0x0',
            '0xff',
            '0xFF',
            '+0xA',
            '-0xAbc',
            '0xdead_beef',
            '0xA_B_C',
        ])('valid: %s', (str) => {
            expect(hexNumber.test(str)).toBe(true)
        })

        test.each([
            '0x', // No digits
            '0xG', // Non-hex
            '0x_FF', // Leading underscore
            '0xFF_', // Trailing underscore
            '0xA__B', // Double underscore
        ])('invalid: %s', (str) => {
            expect(hexNumber.test(str)).toBe(false)
        })
    })

    describe('binaryNumber', () => {
        test.each(['0b0', '0b1', '0b1010', '+0b1_0_1', '-0b11_00'])(
            'valid: %s',
            (str) => {
                expect(binaryNumber.test(str)).toBe(true)
            },
        )

        test.each([
            '0b', // No digits
            '0b2', // Non-binary
            '0b_10', // Leading underscore
            '0b10_', // Trailing underscore
            '0b1__0', // Double underscore
        ])('invalid: %s', (str) => {
            expect(binaryNumber.test(str)).toBe(false)
        })
    })

    describe('bigintNumber', () => {
        test.each([
            '0n',
            '10101000000n',
            '10n',
            '+1_000n',
            '-0n',
            '0xFFn',
            '-0xA_Bn',
            '0b10_10n',
        ])('valid: %s', (str) => {
            expect(bigintNumber.test(str)).toBe(true)
        })

        test.each([
            '10', // Missing n
            '10_n', // Underscore before n
            '10n_', // Trailing underscore
            '+0xn', // Missing digits
            '0x_n', // Underscore right after base
            '0bn', // Missing digits
            '0b_n', // Underscore right after base
            '1__0n', // Double underscore
        ])('invalid: %s', (str) => {
            expect(bigintNumber.test(str)).toBe(false)
        })
    })
})
