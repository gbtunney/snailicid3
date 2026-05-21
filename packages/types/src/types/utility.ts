import type {
    Entries,
    Entry,
    JsonArray,
    JsonObject,
    JsonPrimitive,
    JsonValue,
    UnknownArray,
} from 'type-fest'

/** Function type constraint: any function that returns `boolean`. (Useful for predicates / validators.) */
export type AnyBooleanFn = (...args: Array<any>) => boolean

/** ------ Array & Tuple Utility Types ------ */

/** Any function at all */
export type AnyFn = (...args: Array<any>) => any

/** Function type constraint: any TypeScript type-guard function. */
export type AnyTypeGuardFn = (
    inputValue: any,
    ...args: Array<any>
) => inputValue is any

/**
 * Same parameters as `FnType`, but always returns `boolean`. (Useful for treating type guards as plain predicate
 * signatures.)
 */
export type AsBooleanFn<FnType extends AnyFn> = (
    ...args: Parameters<FnType>
) => boolean

/** Generic “asserts value is T” function type. */
export type AssertionFn<Type, Args extends Array<unknown> = []> = (
    value: unknown,
    ...args: Args
) => asserts value is Type

/** Deeply optional properties. */
export type DeepPartial<Type> = Type extends object
    ? {
          [Prop in keyof Type]?: DeepPartial<Type[Prop]>
      }
    : Type

/** `Entries<T>` wrapper */
export type EntriesOf<Type extends object> = Entries<Type>

/** `Entry<T>` wrapper. @category Utility Types */
export type EntryOf<Type extends object> = Entry<Type>
/**
 * Builds a Record<Key, Value> where Key is inferred from array or object Type. Enforces exhaustiveness: no extra or
 * missing keys.
 */
export type ExhaustiveRecordFrom<
    Type extends ReadonlyArray<unknown> | Record<keyof unknown, unknown>,
    Value = unknown,
> = Record<ExtractKeys<Type>, Value>

/** Infer keys from an array (union of elements) or object type. */
export type ExtractKeys<
    Type extends ReadonlyArray<unknown> | Record<keyof unknown, unknown>,
> =
    Type extends ReadonlyArray<infer U>
        ? Extract<U, PropertyKey>
        : Type extends Record<keyof any, unknown>
          ? keyof Type
          : never

/** First parameter type of a function. */
export type FirstArgOf<FunctionType extends (...args: Array<any>) => any> = Head<
    Parameters<FunctionType>
>

/** Turns an array of `[key, value]` tuples into an object type. */
export type FromEntriesTuples<
    TupleArrayType extends ReadonlyArray<readonly [PropertyKey, unknown]>,
> = {
    [Tuple in TupleArrayType[number] as PropertyKey & Tuple[0]]: Tuple[1]
}

/** First element type of a tuple. */
export type Head<Tuple extends ReadonlyArray<unknown>> = Tuple extends readonly [
    infer First,
    ...Array<unknown>,
]
    ? First
    : never
/** True if `Type` is an array/tuple type. */
export type IsArray<Type> = Type extends UnknownArray ? true : false

/** ------ Object Utility Types ------ */
/** Keys of an object type. */
export type KeysOf<Type extends object> = keyof Type

/** ----- Function Utility Types ----- */

/** Extract the narrowed type from a type-guard function. */
export type NarrowedOf<GuardFunction extends AnyFn> = GuardFunction extends (
    inputValue: any,
    ...args: Array<any>
) => inputValue is infer Narrowed
    ? Extract<Narrowed, TypeGuardInputValue<GuardFunction>>
    : never

/**
 * UTILITY TYPES
 *
 * @category Utility Types
 */
export type PlainObject = {
    [x: string]: unknown
    [y: number]: never
}

/** Prefix all string keys of an object type. */
export type PrefixProperties<Type extends object, Prefix extends string> = {
    [Key in keyof Type as `${Prefix}${Key extends string
        ? Key
        : never}`]: Type[Key]
}

/** Rest parameters (everything after the first) of a function. */
export type RestArgsOf<FunctionType extends (...args: Array<any>) => any> = Tail<
    Parameters<FunctionType>
>

/** Suffix all string keys of an object type. */
export type SuffixProperties<Type extends object, Suffix extends string> = {
    [Key in keyof Type as `${Key extends string
        ? Key
        : never}${Suffix}`]: Type[Key]
}

/** All but the first element type of a tuple. */
export type Tail<Tuple extends ReadonlyArray<unknown>> = Tuple extends readonly [
    unknown,
    ...infer Rest,
]
    ? Rest
    : []

/** Rest parameters after the input value of a type-guard function. */
export type TypeGuardExtraParameters<GuardFunction extends AnyFn> =
    GuardFunction extends (
        inputValue: any,
        ...args: infer RestArgs extends Array<unknown>
    ) => inputValue is any
        ? RestArgs
        : never

/** Function type constraint: a TypeScript type guard with an explicit input, narrowed type, and rest args. */
export type TypeGuardFn<
    InputValue = unknown,
    Narrowed extends InputValue = InputValue,
    RestArgs extends Array<unknown> = Array<unknown>,
> = (inputValue: InputValue, ...args: RestArgs) => inputValue is Narrowed

/** First parameter of a type-guard function. */
export type TypeGuardInputValue<GuardFunction extends AnyFn> =
    GuardFunction extends (
        inputValue: infer InputValue,
        ...args: Array<any>
    ) => inputValue is any
        ? InputValue
        : never

/*
 * @category Utility Types
 * @category Json
 *  */
export namespace Json {
    export type Array = JsonArray
    export type Object = JsonObject
    export type Primitive = JsonPrimitive
    export type Value = Exclude<JsonValue, null>
}

/** TYPEFEST TYPES */
export type {
    Entries,
    Entry,
    Jsonifiable,
    Jsonify,
    KeyAsString,
    LiteralToPrimitive,
    LiteralToPrimitiveDeep,
    LiteralUnion,
    Merge,
    MergeDeep,
    PartialDeep,
    Primitive,
    Simplify,
    SimplifyDeep,
    Stringified,
    UnknownArray,
    UnknownRecord,
    ValueOf,
} from 'type-fest'
