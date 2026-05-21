import { describe, expect, expectTypeOf, test } from 'vitest'
import {
    type BoolValidatorResult,
    factoryTypeGuard,
    factoryValidator,
    type ValidatorResult,
    type ValidatorReturn,
} from './validator-factory.js'

describe('factoryValidator core', () => {
    const finitePredicate = (value: unknown): value is number =>
        typeof value === 'number' && Number.isFinite(value)

    test('creates isX and isNotX from a type guard', () => {
        const validators = factoryValidator(finitePredicate, 'finiteNumber')

        expectTypeOf(validators).toEqualTypeOf<
            ValidatorReturn<typeof finitePredicate, 'finiteNumber'>
        >()
        expectTypeOf(validators.isFiniteNumber).guards.toEqualTypeOf<number>()
        expectTypeOf(
            validators.isNotFiniteNumber,
        ).returns.toEqualTypeOf<boolean>()

        expect(validators.isFiniteNumber(10)).toBe(true)
        expect(validators.isFiniteNumber(Infinity)).toBe(false)
        expect(validators.isNotFiniteNumber(Infinity)).toBe(true)
    })

    test('creates boolean validators from a boolean predicate', () => {
        const alphaPredicate = (value: unknown): boolean =>
            typeof value === 'string' && /^[a-z]+$/i.test(value)
        const validators = factoryValidator(alphaPredicate, 'alpha')

        expectTypeOf(validators).toEqualTypeOf<BoolValidatorResult<'alpha'>>()
        expectTypeOf(validators.isAlpha).returns.toEqualTypeOf<boolean>()
        expectTypeOf(validators.isNotAlpha).returns.toEqualTypeOf<boolean>()

        expect(validators.isAlpha('abc')).toBe(true)
        expect(validators.isAlpha('123')).toBe(false)
        expect(validators.isNotAlpha('123')).toBe(true)
    })

    test('preserves extra predicate parameters', () => {
        const hasMinLength = (value: string, min: number): boolean =>
            value.length >= min
        const validators = factoryValidator(hasMinLength, 'minLength')

        expectTypeOf(validators.isMinLength).parameters.toEqualTypeOf<
            [string, number]
        >()
        expectTypeOf(validators.isNotMinLength).parameters.toEqualTypeOf<
            [string, number]
        >()

        expect(validators.isMinLength('hello', 3)).toBe(true)
        expect(validators.isMinLength('hi', 3)).toBe(false)
        expect(validators.isNotMinLength('hi', 3)).toBe(true)
    })

    test('pascal-cases spaced, dashed, underscored, and camel names', () => {
        const ok = (value: unknown): boolean => Boolean(value)

        expect(factoryValidator(ok, 'plain text')).toHaveProperty('isPlainText')
        expect(factoryValidator(ok, 'plain-text')).toHaveProperty('isPlainText')
        expect(factoryValidator(ok, 'plain_text')).toHaveProperty('isPlainText')
        expect(factoryValidator(ok, 'plainText')).toHaveProperty('isPlainText')
    })

    test('supports custom positive and negative prefixes', () => {
        const hasItems = (value: ReadonlyArray<unknown>): boolean =>
            value.length > 0
        const validators = factoryValidator(hasItems, 'items', {
            negativePrefix: 'lacks',
            positivePrefix: 'has',
        })

        expectTypeOf(validators).toEqualTypeOf<
            BoolValidatorResult<
                'items',
                ReadonlyArray<unknown>,
                [],
                'has',
                'lacks'
            >
        >()

        expect(validators.hasItems(['a'])).toBe(true)
        expect(validators.hasItems([])).toBe(false)
        expect(validators.lacksItems([])).toBe(true)
    })
})

describe('factoryTypeGuard', () => {
    const finitePredicate = (value: unknown): boolean =>
        typeof value === 'number' && Number.isFinite(value)

    test('upgrades a boolean predicate into a named type guard pair', () => {
        const validators = factoryTypeGuard<
            number,
            'finiteNumber',
            typeof finitePredicate
        >(finitePredicate, 'finiteNumber')

        expectTypeOf(validators).toEqualTypeOf<
            ValidatorResult<number, 'finiteNumber'>
        >()
        expectTypeOf(validators.isFiniteNumber).guards.toEqualTypeOf<number>()
        expectTypeOf(
            validators.isNotFiniteNumber,
        ).returns.toEqualTypeOf<boolean>()

        const value: unknown = 10
        if (validators.isFiniteNumber(value)) {
            expectTypeOf(value).toEqualTypeOf<number>()
        }

        expect(validators.isFiniteNumber(10)).toBe(true)
        expect(validators.isFiniteNumber('10')).toBe(false)
        expect(validators.isNotFiniteNumber('10')).toBe(true)
    })

    test('supports custom prefixes for upgraded guards', () => {
        const validators = factoryTypeGuard<
            number,
            'count',
            typeof finitePredicate,
            'accepts',
            'rejects'
        >(finitePredicate, 'count', {
            negativePrefix: 'rejects',
            positivePrefix: 'accepts',
        })

        expectTypeOf(validators).toEqualTypeOf<
            ValidatorResult<number, 'count', unknown, [], 'accepts', 'rejects'>
        >()

        expect(validators.acceptsCount(3)).toBe(true)
        expect(validators.rejectsCount('3')).toBe(true)
    })
})
