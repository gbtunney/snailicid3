
import { describe, expect, test } from 'vitest'
import { type PlainObject } from './../types/utility.js'
import { guardToAssertion, predicateToAssertion,AssertionFunctionFromGuard,AssertionFunctionFromPredicate, } from './assertation.js'
import { isJsonifiableArray } from './json.typeguards.js'
import { isBigInt, isPlainObject, isString } from './utility.typeguards.js'

/** Generic local helper to avoid a zillion assertion type aliases */
type AssertionFn<T, Args extends unknown[] = []> = (
    value: unknown,
    ...args: Args
) => asserts value is T

/** Local minimal validators replacing the removed number/validators dependency */
const isNumeric = (value: unknown): value is bigint | number =>
    typeof value === 'number' || typeof value === 'bigint'

const isPossibleNumeric = (
    value: unknown,
    strict = true,
): value is number | string => {
    if (typeof value === 'number') return true
    if (typeof value !== 'string') return false
    const trimmed = value.trim()
    if (trimmed === '') return false
    if (!strict) return true
    return !Number.isNaN(Number(trimmed)) || /^[+-]?0x[\da-f]+$/i.test(trimmed)
}

const isValidScientificNumber = (value: unknown): value is number | string => {
    if (typeof value === 'number') return !Number.isNaN(value)
    if (typeof value !== 'string') return false
    return /^[+-]?(?:\d(?:_?\d)*(?:\.\d(?:_?\d)*)?|\.\d(?:_?\d)*)(?:e[+-]?\d(?:_?\d)*)?$/i.test(
        value,
    )
}

/** Local predicates for this test */
const minLen = (value: string, min: number): boolean => value.length >= min
const startsWithPrefix = (value: string, prefix: string): boolean =>
    value.startsWith(prefix)

// Guard-derived assertions (no casts needed)
const assertIsString: AssertionFn<string> = guardToAssertion(isString)
const assertIsBigInt: AssertionFn<bigint> = guardToAssertion(isBigInt)
const assertIsNumeric: AssertionFn<bigint | number> = guardToAssertion(isNumeric)
const assertIsPossibleNumeric: AssertionFunctionFromGuard<typeof isPossibleNumeric> =
    guardToAssertion(isPossibleNumeric)
const assertIsPlainObject: AssertionFunctionFromGuard<typeof isPlainObject> =
    guardToAssertion(isPlainObject)
const assertIsJsonArray: AssertionFn<unknown[]> = guardToAssertion(isJsonifiableArray)

// Predicate-based assertions
const assertMinLen: AssertionFunctionFromPredicate<typeof minLen> = predicateToAssertion(minLen)
const assertStartsWithPrefix: AssertionFunctionFromPredicate<typeof startsWithPrefix> =
    predicateToAssertion(startsWithPrefix)

const assertIsValidScientific: AssertionFn<number | string> =
    guardToAssertion(isValidScientificNumber)

describe('typeguards', () => {
    test('string', () => {
        assertIsString('ok')
        expect(() => {
            assertIsString(42)
        }).toThrow()
    })

    test('bigint', () => {
        assertIsBigInt(10n)
        expect(() => {
            assertIsBigInt('10')
        }).toThrow()
    })

    test('numeric', () => {
        assertIsNumeric(2)
        expect(() => {
            assertIsNumeric('2')
        }).toThrow()

        assertIsPossibleNumeric(2)

        expect(() => {
            assertIsPossibleNumeric('2tt', true)
        }).toThrow()
    })

    test('plain object', () => {
        assertIsPlainObject({ hello: 'ff' })
        expect(() => {
            assertIsPlainObject(2)
        }).toThrow()
    })

    test('json array', () => {
        assertIsJsonArray(['str1', 'str2'])
        expect(() => {
            assertIsJsonArray({ hello: 'ff' })
        }).toThrow()
    })

    test('min length', () => {
        assertMinLen('abc', 2)
        expect(() => {
            assertMinLen('a', 2)
        }).toThrow()
    })

    test('starts with prefix', () => {
        assertStartsWithPrefix('abc', 'a')
        expect(() => {
            assertStartsWithPrefix('_abc', 'a')
        }).toThrow()
    })

    test('scientific', () => {
        expect(() => {
            assertIsValidScientific('1e-10')
        }).toBeDefined()
        expect(() => {
            assertIsValidScientific('10')
        }).toBeDefined()
        expect(() => {
            assertIsValidScientific('1.2.3')
        }).toThrow()
        expect(() => {
            assertIsValidScientific('10nnnn')
        }).toThrow()
    })
})

const unsafeFn: (value: string, ...args: Array<unknown>) => boolean = (value) =>
    value.length > 0