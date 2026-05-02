export type AssertionFunctionFromGuard<Guard extends TypeGuardFunction> = (
    value: TypeGuardInputValue<Guard>,
    ...args: TypeGuardExtraParameters<Guard>
) => asserts value is TypeGuardNarrowedType<Guard>

/**
 * Assertion type derived from a boolean predicate.
 *
 * Preserves the predicate's input type and extra parameters. The narrowed type defaults to the input type since boolean
 * predicates do not carry narrowing information.
 */
export type AssertionFunctionFromPredicate<
    Predicate extends BooleanPredicateFunction,
    Narrowed extends PredicateInputValue<Predicate> =
        PredicateInputValue<Predicate>,
> = (
    value: PredicateInputValue<Predicate>,
    ...args: PredicateExtraParameters<Predicate>
) => asserts value is Narrowed

export type BooleanPredicateFunction = (
    value: unknown,
    ...args: Array<unknown>
) => boolean

export type PredicateExtraParameters<
    Predicate extends BooleanPredicateFunction,
> = Parameters<Predicate> extends [unknown, ...infer Rest] ? Rest : never

export type PredicateInputValue<Predicate extends BooleanPredicateFunction> =
    Parameters<Predicate>[0]

export type TypeGuardExtraParameters<Guard extends TypeGuardFunction> =
    TypeGuardParameters<Guard> extends [unknown, ...infer Rest] ? Rest : never

export type TypeGuardFunction = (
    value: unknown,
    ...args: Array<unknown>
) => value is unknown

export type TypeGuardInputValue<Guard extends TypeGuardFunction> =
    TypeGuardParameters<Guard>[0]

export type TypeGuardNarrowedType<Guard extends TypeGuardFunction> =
    Guard extends (
        value: unknown,
        ...args: Array<unknown>
    ) => value is infer Narrowed
        ? Narrowed
        : never

export type TypeGuardParameters<Guard extends TypeGuardFunction> =
    Parameters<Guard>

/**
 * Builds an assertion from a true type guard.
 *
 * Preserves extra parameters and narrows the input on success. Throws a TypeError on failure.
 *
 * @category Assertions
 * @example
 *     const isStringGuard = (v: unknown): v is string => typeof v === 'string'
 *     const assertIsString2 = guardToAssertion(isStringGuard)
 *     assertIsString2('ok') // v is string afterwards
 *     // assertIsString2(42)  // throws TypeError
 *
 * @group Typeguard
 */
export function guardToAssertion<Guard extends TypeGuardFunction>(
    guard: Guard,
    message = 'Assertion failed',
): AssertionFunctionFromGuard<Guard> {
    return (
        value: TypeGuardInputValue<Guard>,
        ...args: TypeGuardExtraParameters<Guard>
    ): asserts value is TypeGuardNarrowedType<Guard> => {
        if (!guard(value, ...args)) {
            throw new TypeError(message)
        }
    }
}

/**
 * Builds an assertion from a boolean-returning predicate.
 *
 * Throws a TypeError if the predicate returns false.
 *
 * @category Assertions
 * @example
 *     const isEven = (n: number) => n % 2 === 0
 *     const assertIsEven = predicateToAssertion(isEven)
 *     assertIsEven(4) // ok
 *     // assertIsEven(3) // throws TypeError
 *
 * @group Typeguard
 */
export function predicateToAssertion<
    Predicate extends BooleanPredicateFunction,
>(
    predicate: Predicate,
    message = 'Assertion failed',
): AssertionFunctionFromPredicate<Predicate> {
    return (
        value: PredicateInputValue<Predicate>,
        ...args: PredicateExtraParameters<Predicate>
    ): asserts value is PredicateInputValue<Predicate> => {
        if (!predicate(value, ...args)) {
            throw new TypeError(message)
        }
    }
}
