import type { PascalCase } from 'type-fest'
import type {AsBooleanFn,AnyTypeGuardFn,NarrowedOf, AnyBooleanFn, FirstArgOf, RestArgsOf } from './../types/utility.js'

export type ValidatorFn = AnyBooleanFn

export type BoolPredicate<InputValue = unknown, RestArgs extends unknown[] = []> = (
    inputValue: InputValue,
    ...args: RestArgs
) => boolean

/**
 * A type-guard predicate.
 * `Narrowed` must be assignable to `InputValue` (required by TS for `value is Narrowed`).
 */
export type Predicate<
    Narrowed extends InputValue,
    InputValue = unknown,
    RestArgs extends unknown[] = [],
> = (inputValue: InputValue, ...args: RestArgs) => inputValue is Narrowed

type IsKey<BaseName extends string> = `is${PascalCase<BaseName>}`
type IsNotKey<BaseName extends string> = `isNot${PascalCase<BaseName>}`

export type BoolValidatorResult<
    BaseName extends string,
    InputValue = unknown,
    RestArgs extends unknown[] = [],
> = {
    [Key in IsKey<BaseName>]: (inputValue: InputValue, ...args: RestArgs) => boolean
} & {
    [Key in IsNotKey<BaseName>]: (inputValue: InputValue, ...args: RestArgs) => boolean
}

export type ValidatorResult<
    Narrowed extends InputValue,
    BaseName extends string,
    InputValue = unknown,
    RestArgs extends unknown[] = [],
> = {
    [Key in IsKey<BaseName>]: (
        inputValue: InputValue,
        ...args: RestArgs
    ) => inputValue is Narrowed
} & {
    [Key in IsNotKey<BaseName>]: (inputValue: InputValue, ...args: RestArgs) => boolean
}


export type ValidatorReturn<
    PredicateFunction extends AnyBooleanFn,
    BaseName extends string,
> = PredicateFunction extends AnyTypeGuardFn
    ? // Ensure the narrowed type is assignable to the input type (required for `value is Narrowed`)
      NarrowedOf<PredicateFunction> extends FirstArgOf<PredicateFunction>
        ? ValidatorResult<
              NarrowedOf<PredicateFunction>,
              BaseName,
              FirstArgOf<PredicateFunction>,
              RestArgsOf<PredicateFunction>
          >
        : never
    : BoolValidatorResult<
          BaseName,
          FirstArgOf<PredicateFunction>,
          RestArgsOf<PredicateFunction>
      >
/** Split on delimiters & camelCase transitions, then PascalCase. */
const toPascal = (rawName: string): string => {
    const parts: Array<string> = rawName
        .replace(/[\s_-]+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean)
        .flatMap(
            (segment) => segment.match(/[A-Z]?[\da-z]+|[A-Z]+(?![a-z])/g) ?? [],
        )
    return parts
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')
}

/**
 * For boolean predicates: returns `{ isX: boolean, isNotX: boolean }`.
 * For type-guard predicates: returns `{ isX: type-guard, isNotX: boolean }`.
 */
export function factoryValidator<
    BaseName extends string,
    PredicateFunction extends AnyBooleanFn,
>(
    predicateFunction: PredicateFunction,
    baseName: BaseName,
): ValidatorReturn<PredicateFunction, BaseName> {
    const pascalCaseName = toPascal(baseName) as PascalCase<BaseName>
    const isKeyName: IsKey<BaseName> = `is${pascalCaseName}`
    const isNotKeyName: IsNotKey<BaseName> = `isNot${pascalCaseName}`

    type InputValue = FirstArgOf<PredicateFunction>
    type RestArgs = RestArgsOf<PredicateFunction>

    const isFunction = (inputValue: InputValue, ...args: RestArgs): boolean =>
        predicateFunction(inputValue, ...args)

    const isNotFunction = (inputValue: InputValue, ...args: RestArgs): boolean =>
        !isFunction(inputValue, ...args)

    return {
        [isKeyName]: isFunction,
        [isNotKeyName]: isNotFunction,
    } as ValidatorReturn<PredicateFunction, BaseName>
}

/**
 * Upgrade a boolean predicate into a typed type guard by explicitly supplying `Narrowed`.
 *
 * `Narrowed` must be assignable to the predicate's first-arg type.
 */
export function factoryTypeGuard<
    Narrowed extends FirstArgOf<PredicateFunction>,
    BaseName extends string,
    PredicateFunction extends AnyBooleanFn,
>(
    predicateFunction: PredicateFunction,
    baseName: BaseName,
): ValidatorResult<
    Narrowed,
    BaseName,
    FirstArgOf<PredicateFunction>,
    RestArgsOf<PredicateFunction>
> {
    const pascalCaseName = toPascal(baseName) as PascalCase<BaseName>
    const isKeyName: IsKey<BaseName> = `is${pascalCaseName}`
    const isNotKeyName: IsNotKey<BaseName> = `isNot${pascalCaseName}`

    type InputValue = FirstArgOf<PredicateFunction>
    type RestArgs = RestArgsOf<PredicateFunction>

    const isGuard = (
        inputValue: InputValue,
        ...args: RestArgs
    ): inputValue is Narrowed => predicateFunction(inputValue, ...args)

    const isNotFunction = (inputValue: InputValue, ...args: RestArgs): boolean =>
        !predicateFunction(inputValue, ...args)

    return {
        [isKeyName]: isGuard,
        [isNotKeyName]: isNotFunction,
    } as ValidatorResult<Narrowed, BaseName, InputValue, RestArgs>
}