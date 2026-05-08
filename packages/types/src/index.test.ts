import { describe, expect, test } from 'vitest'
import { tg } from './typeguard/index.js'

describe('@snailicid3/types — tg.isTruthy / tg.isFalsy', () => {
    test('isTruthy returns true for truthy values', () => {
        expect(tg.isTruthy(1)).toBe(true)
        expect(tg.isTruthy('hello')).toBe(true)
        expect(tg.isTruthy([])).toBe(true)
        expect(tg.isTruthy({})).toBe(true)
    })

    test('isTruthy returns false for falsy values', () => {
        expect(tg.isTruthy(0)).toBe(false)
        expect(tg.isTruthy('')).toBe(false)
        expect(tg.isTruthy(null)).toBe(false)
        expect(tg.isTruthy(undefined)).toBe(false)
    })

    test('isFalsy is the inverse of isTruthy', () => {
        expect(tg.isFalsy(0)).toBe(true)
        expect(tg.isFalsy('')).toBe(true)
        expect(tg.isFalsy(null)).toBe(true)
        expect(tg.isFalsy(1)).toBe(false)
    })
})

describe('@snailicid3/types — tg.isNilOrEmpty', () => {
    test('returns true for nil and empty values', () => {
        expect(tg.isNilOrEmpty(null)).toBe(true)
        expect(tg.isNilOrEmpty(undefined)).toBe(true)
        expect(tg.isNilOrEmpty('')).toBe(true)
        expect(tg.isNilOrEmpty([])).toBe(true)
        expect(tg.isNilOrEmpty({})).toBe(true)
    })

    test('returns false for non-empty values', () => {
        expect(tg.isNilOrEmpty([1, 2])).toBe(false)
        expect(tg.isNilOrEmpty('hello')).toBe(false)
        expect(tg.isNilOrEmpty(0)).toBe(false)
    })
})

describe('@snailicid3/types — tg.guardToAssertion', () => {
    test('creates an assertion from a predicate that passes when predicate is true', () => {
        const assertIsString: (value: unknown) => asserts value is string =
            tg.guardToAssertion(
                (v: unknown): v is string => typeof v === 'string',
            )
        expect(() => {
            assertIsString('hello')
        }).not.toThrow()
        expect(() => {
            assertIsString(42)
        }).toThrow()
    })
})
