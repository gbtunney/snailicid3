import { describe, expect, expectTypeOf, test } from 'vitest'
import {
    isBigIntLiteral,
    isBinaryNumber,
    isHexNumber,
    isInteger,
    isMatchRegExp,
    isNotBigIntLiteral,
    isNotBinaryNumber,
    isNotHexNumber,
    isNotInteger,
    isNotMatchRegExp,
    isNotScientificNumber,
    isScientificNumber,
} from './validator-factory.examples.js'

describe('validator-factory with dictionary regex predicates', () => {
    test('exports scientificNumber predicate pairs', () => {
        expectTypeOf(isScientificNumber).guards.toEqualTypeOf<string>()
        expectTypeOf(isNotScientificNumber).returns.toEqualTypeOf<boolean>()
        expect(isScientificNumber('1e3')).toBe(true)
        expect(isNotScientificNumber('1e3')).toBe(false)
        expect(isScientificNumber('6.02e23')).toBe(true)
        expect(isScientificNumber('abc')).toBe(false)
        expect(isNotScientificNumber('abc')).toBe(true)
    })

    test('exports hexNumber predicate pairs', () => {
        expectTypeOf(isHexNumber).guards.toEqualTypeOf<string>()
        expectTypeOf(isNotHexNumber).returns.toEqualTypeOf<boolean>()
        expect(isHexNumber('0xff')).toBe(true)
        expect(isNotHexNumber('0xff')).toBe(false)
        expect(isHexNumber('+0xA')).toBe(true)
        expect(isHexNumber('0x')).toBe(false)
        expect(isNotHexNumber('0x')).toBe(true)
    })

    test('exports binaryNumber predicate pairs', () => {
        expectTypeOf(isBinaryNumber).guards.toEqualTypeOf<string>()
        expectTypeOf(isNotBinaryNumber).returns.toEqualTypeOf<boolean>()
        expect(isBinaryNumber('0b1010')).toBe(true)
        expect(isNotBinaryNumber('0b1010')).toBe(false)
        expect(isBinaryNumber('-0b11')).toBe(true)
        expect(isBinaryNumber('0b102')).toBe(false)
        expect(isNotBinaryNumber('0b102')).toBe(true)
    })

    test('exports bigIntLiteral predicate pairs', () => {
        expectTypeOf(isBigIntLiteral).guards.toEqualTypeOf<string>()
        expectTypeOf(isNotBigIntLiteral).returns.toEqualTypeOf<boolean>()
        expect(isBigIntLiteral('10n')).toBe(true)
        expect(isNotBigIntLiteral('10n')).toBe(false)
        expect(isBigIntLiteral('-0xFFn')).toBe(true)
        expect(isBigIntLiteral('0b1010n')).toBe(true)
        expect(isBigIntLiteral('10')).toBe(false)
        expect(isNotBigIntLiteral('10')).toBe(true)
    })

    test('exports matchRegExp predicate pairs with extra args', () => {
        expectTypeOf(isMatchRegExp).parameters.toEqualTypeOf<[string, RegExp]>()
        expectTypeOf(isMatchRegExp).guards.toEqualTypeOf<string>()
        expectTypeOf(isNotMatchRegExp).parameters.toEqualTypeOf<
            [string, RegExp]
        >()
        expectTypeOf(isNotMatchRegExp).returns.toEqualTypeOf<boolean>()

        expect(isMatchRegExp('snailicid3', /^snail/)).toBe(true)
        expect(isNotMatchRegExp('snailicid3', /^snail/)).toBe(false)
        expect(isMatchRegExp('snailicid3', /^slug/)).toBe(false)
        expect(isNotMatchRegExp('snailicid3', /^slug/)).toBe(true)
    })

    test('exports integer predicate pairs from ramda-adjunct', () => {
        expectTypeOf(isInteger).guards.toEqualTypeOf<number>()
        expectTypeOf(isNotInteger).returns.toEqualTypeOf<boolean>()

        expect(isInteger(3)).toBe(true)
        expect(isNotInteger(3)).toBe(false)
        expect(isInteger(3.4)).toBe(false)
        expect(isNotInteger(3.4)).toBe(true)
    })
})

describe('validator-factory legacy examples', () => {
    test('scientificNumber predicates', () => {
        expect(isScientificNumber('1e3')).toBe(true)
        expect(isScientificNumber('6.02e23')).toBe(true)
        expect(isScientificNumber('abc')).toBe(false)
        expect(isNotScientificNumber('abc')).toBe(true)
    })

    test('hexNumber predicates', () => {
        expect(isHexNumber('0xff')).toBe(true)
        expect(isHexNumber('+0xA')).toBe(true)
        expect(isHexNumber('0x')).toBe(false)
        expect(isNotHexNumber('0x')).toBe(true)
    })

    test('binaryNumber predicates', () => {
        expect(isBinaryNumber('0b1010')).toBe(true)
        expect(isBinaryNumber('-0b11')).toBe(true)
        expect(isBinaryNumber('0b102')).toBe(false)
        expect(isNotBinaryNumber('0b102')).toBe(true)
    })

    test('bigIntLiteral predicates', () => {
        expect(isBigIntLiteral('10n')).toBe(true)
        expect(isBigIntLiteral('-0xFFn')).toBe(true)
        expect(isBigIntLiteral('0b1010n')).toBe(true)
        expect(isBigIntLiteral('10')).toBe(false)
        expect(isNotBigIntLiteral('10')).toBe(true)
    })
})
