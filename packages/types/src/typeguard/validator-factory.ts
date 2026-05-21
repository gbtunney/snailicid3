import type { PascalCase } from 'type-fest'
import type {
    AnyBooleanFn,
    AnyTypeGuardFn,
    AsBooleanFn,
    FirstArgOf,
    NarrowedOf,
    RestArgsOf,
} from './../types/utility.js'

export type BoolPredicate<
    InputValue = unknown,
    RestArgs extends Array<unknown> = [],
> = (inputValue: InputValue, ...args: RestArgs) => boolean

export type BoolValidatorResult<
    BaseName extends string,
    InputValue = unknown,
    RestArgs extends Array<unknown> = [],
    PositivePrefix extends string = 'is',
    NegativePrefix extends string = 'isNot',
> = {
    [Key in ValidatorKey<NegativePrefix, BaseName>]: (
        inputValue: InputValue,
        ...args: RestArgs
    ) => boolean
} & {
    [Key in ValidatorKey<PositivePrefix, BaseName>]: (
        inputValue: InputValue,
        ...args: RestArgs
    ) => boolean
}

/** A type-guard predicate. `Narrowed` must be assignable to `InputValue` (required by TS for `value is Narrowed`). */
export type Predicate<
    Narrowed extends InputValue,
    InputValue = unknown,
    RestArgs extends Array<unknown> = [],
> = (inputValue: InputValue, ...args: RestArgs) => inputValue is Narrowed

export type ValidatorFn<FunctionType extends AnyBooleanFn = AnyBooleanFn> =
    AsBooleanFn<FunctionType>

export type ValidatorPrefixes<
    PositivePrefix extends string = 'is',
    NegativePrefix extends string = 'isNot',
> = {
    negativePrefix?: NegativePrefix
    positivePrefix?: PositivePrefix
}

export type ValidatorResult<
    Narrowed extends InputValue,
    BaseName extends string,
    InputValue = unknown,
    RestArgs extends Array<unknown> = [],
    PositivePrefix extends string = 'is',
    NegativePrefix extends string = 'isNot',
> = {
    [Key in ValidatorKey<NegativePrefix, BaseName>]: (
        inputValue: InputValue,
        ...args: RestArgs
    ) => boolean
} & {
    [Key in ValidatorKey<PositivePrefix, BaseName>]: (
        inputValue: InputValue,
        ...args: RestArgs
    ) => inputValue is Narrowed
}

export type ValidatorReturn<
    PredicateFunction extends AnyBooleanFn,
    BaseName extends string,
    PositivePrefix extends string = 'is',
    NegativePrefix extends string = 'isNot',
> = PredicateFunction extends AnyTypeGuardFn
    ? // Ensure the narrowed type is assignable to the input type (required for `value is Narrowed`)
      NarrowedOf<PredicateFunction> extends FirstArgOf<PredicateFunction>
        ? ValidatorResult<
              NarrowedOf<PredicateFunction>,
              BaseName,
              FirstArgOf<PredicateFunction>,
              RestArgsOf<PredicateFunction>,
              PositivePrefix,
              NegativePrefix
          >
        : never
    : BoolValidatorResult<
          BaseName,
          FirstArgOf<PredicateFunction>,
          RestArgsOf<PredicateFunction>,
          PositivePrefix,
          NegativePrefix
      >

type ValidatorKey<
    Prefix extends string,
    BaseName extends string,
> = `${Prefix}${PascalCase<BaseName>}`
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
 * Upgrade a boolean predicate into a typed type guard by explicitly supplying `Narrowed`.
 *
 * `Narrowed` must be assignable to the predicate's first-arg type.
 */
export function factoryTypeGuard<
    Narrowed extends FirstArgOf<PredicateFunction>,
    BaseName extends string,
    PredicateFunction extends AnyBooleanFn,
    PositivePrefix extends string = 'is',
    NegativePrefix extends string = 'isNot',
>(
    predicateFunction: PredicateFunction,
    baseName: BaseName,
    prefixes: ValidatorPrefixes<PositivePrefix, NegativePrefix> = {},
): ValidatorResult<
    Narrowed,
    BaseName,
    FirstArgOf<PredicateFunction>,
    RestArgsOf<PredicateFunction>,
    PositivePrefix,
    NegativePrefix
> {
    const pascalCaseName = toPascal(baseName) as PascalCase<BaseName>
    const positivePrefix = (prefixes.positivePrefix ?? 'is') as PositivePrefix
    const negativePrefix = (prefixes.negativePrefix ??
        'isNot') as NegativePrefix
    const positiveKeyName =
        `${positivePrefix}${pascalCaseName}` as ValidatorKey<
            PositivePrefix,
            BaseName
        >
    const negativeKeyName =
        `${negativePrefix}${pascalCaseName}` as ValidatorKey<
            NegativePrefix,
            BaseName
        >

    type InputValue = FirstArgOf<PredicateFunction>
    type RestArgs = RestArgsOf<PredicateFunction>

    const isGuard = (
        inputValue: InputValue,
        ...args: RestArgs
    ): inputValue is Narrowed => predicateFunction(inputValue, ...args)

    const isNotFunction = (
        inputValue: InputValue,
        ...args: RestArgs
    ): boolean => !predicateFunction(inputValue, ...args)

    return {
        [negativeKeyName]: isNotFunction,
        [positiveKeyName]: isGuard,
    } as ValidatorResult<
        Narrowed,
        BaseName,
        InputValue,
        RestArgs,
        PositivePrefix,
        NegativePrefix
    >
}

/**
 * For boolean predicates: returns `{ isX: boolean, isNotX: boolean }`. For type-guard predicates: returns `{ isX:
 * type-guard, isNotX: boolean }`.
 */
export function factoryValidator<
    BaseName extends string,
    PredicateFunction extends AnyBooleanFn,
    PositivePrefix extends string = 'is',
    NegativePrefix extends string = 'isNot',
>(
    predicateFunction: PredicateFunction,
    baseName: BaseName,
    prefixes: ValidatorPrefixes<PositivePrefix, NegativePrefix> = {},
): ValidatorReturn<
    PredicateFunction,
    BaseName,
    PositivePrefix,
    NegativePrefix
> {
    const pascalCaseName = toPascal(baseName) as PascalCase<BaseName>
    const positivePrefix = (prefixes.positivePrefix ?? 'is') as PositivePrefix
    const negativePrefix = (prefixes.negativePrefix ??
        'isNot') as NegativePrefix
    const positiveKeyName =
        `${positivePrefix}${pascalCaseName}` as ValidatorKey<
            PositivePrefix,
            BaseName
        >
    const negativeKeyName =
        `${negativePrefix}${pascalCaseName}` as ValidatorKey<
            NegativePrefix,
            BaseName
        >

    type InputValue = FirstArgOf<PredicateFunction>
    type RestArgs = RestArgsOf<PredicateFunction>

    const isFunction = (inputValue: InputValue, ...args: RestArgs): boolean =>
        predicateFunction(inputValue, ...args)

    const isNotFunction = (
        inputValue: InputValue,
        ...args: RestArgs
    ): boolean => !isFunction(inputValue, ...args)

    return {
        [negativeKeyName]: isNotFunction,
        [positiveKeyName]: isFunction,
    } as ValidatorReturn<
        PredicateFunction,
        BaseName,
        PositivePrefix,
        NegativePrefix
    >
}
