import type {
    Entries,
    Entry,
    JsonArray,
    JsonObject,
    JsonPrimitive,
    JsonValue,
    UnknownArray,
} from 'type-fest'

/** UTILITY TYPES
 * @category Utility Types
 */
export type PlainObject = {
    [x: string]: unknown
    [y: number]: never
}

/** ------ Array & Tuple Utility Types ------ */

/** True if `Type` is an array/tuple type. */
 export type IsArray<Type> = Type extends UnknownArray ? true : false

/** First element type of a tuple. */
 export type Head<Tuple extends readonly unknown[]> =
    Tuple extends readonly [infer First, ...unknown[]] ? First : never

/** All but the first element type of a tuple. */
 export type Tail<Tuple extends readonly unknown[]> =
    Tuple extends readonly [unknown, ...infer Rest] ? Rest : []

/** First parameter type of a function.  */
 export type FirstArgOf<FunctionType extends (...args: any[]) => any> =
    Head<Parameters<FunctionType>>

/** Rest parameters (everything after the first) of a function. */
 export type RestArgsOf<FunctionType extends (...args: any[]) => any> =
    Tail<Parameters<FunctionType>>

/** ------ Object Utility Types ------ */
/** Keys of an object type. */
export type KeysOf<Type extends object> = keyof Type

/** `Entries<T>` wrapper */
export type EntriesOf<Type extends object> = Entries<Type>
/** `Entry<T>` wrapper. @category Utility Types */
export type EntryOf<Type extends object> = Entry<Type>

/** Builds a Record<Key, Value> where Key is inferred from array or object Type. Enforces exhaustiveness: no extra or missing keys. */
export type ExhaustiveRecordFrom<
    Type extends ReadonlyArray<unknown> | Record<keyof unknown, unknown>,
    Value = unknown,
> = Record<ExtractKeys<Type>, Value>

/**
 * Infer keys from an array (union of elements) or object type.
 
 
 */
export type ExtractKeys<
    Type extends ReadonlyArray<unknown> | Record<keyof unknown, unknown>,
> =
    Type extends ReadonlyArray<infer U>
        ? Extract<U, PropertyKey>
        : Type extends Record<keyof any, unknown>
          ? keyof Type
          : never

/**
 * Turns an array of `[key, value]` tuples into an object type.
 */
export type FromEntriesTuples<
    TupleArrayType extends ReadonlyArray<readonly [PropertyKey, unknown]>,
> = {
    [Tuple in TupleArrayType[number] as PropertyKey & Tuple[0]]: Tuple[1]
}

/** Prefix all string keys of an object type.  */
 export type PrefixProperties<Type extends object, Prefix extends string> = {
    [Key in keyof Type as `${Prefix}${Key extends string
        ? Key
        : never}`]: Type[Key]
}
/** Suffix all string keys of an object type.    */
 export type SuffixProperties<Type extends object, Suffix extends string> = {
    [Key in keyof Type as `${Key extends string
        ? Key
        : never}${Suffix}`]: Type[Key]
}

/** Deeply optional properties. */
export type DeepPartial<Type> = Type extends object
    ? {
          [Prop in keyof Type]?: DeepPartial<Type[Prop]>
      }
    : Type

/** ----- Function Utility Types ----- */

/** any function at all */
export type AnyFn = (...args: any[]) => any

/**
 * Function type constraint: any function that returns `boolean`.
 * (Useful for predicates / validators.)
 */
export type AnyBooleanFn = (...args: any[]) => boolean


/**
 * Function type constraint: any TypeScript type-guard function.
 */
export type AnyTypeGuardFn = (
    inputValue: unknown,
    ...args: unknown[]
) => inputValue is unknown


/** Generic “asserts value is T” function type. */
export type AssertionFn<Type, Args extends unknown[] = []> = (
    value: unknown,
    ...args: Args
) => asserts value is Type

/**
 * Same parameters as `FnType`, but always returns `boolean`.
 * (Useful for treating type guards as plain predicate signatures.)

 */
export type AsBooleanFn<FnType extends AnyFn> = (...args: Parameters<FnType>) => boolean

/**
 * Extract the narrowed type from a type-guard function.

 */
export type NarrowedOf<GuardFunction extends AnyTypeGuardFn> =
    GuardFunction extends (inputValue: any, ...args: any[]) => inputValue is infer Narrowed
        ? Narrowed
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
