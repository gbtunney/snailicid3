/**
 * JSON value helpers with strict runtime boundaries and branded serialized strings.
 *
 * This module intentionally does not read or write files. It only answers questions about values:
 *
 * - Is this unknown value valid JSON data?
 * - What TypeScript type would survive a JSON serialization boundary?
 * - Can this string be parsed as a JSON value?
 * - Can this external value be normalized into safe JSON data?
 * - Can this JSON value be serialized into a branded JSON string?
 */

/** Tiny local brand helper so this module does not depend on a validation library. */
export type Brand<Type, Name extends string> = Type & {
    readonly __brand: Name
}

/** JSON primitives are the leaf values allowed by the JSON data model. */
export type JsonPrimitive = boolean | null | number | string

/** JSON arrays can contain any JSON value. */
export type JsonArray = Array<JsonValue>

/** JSON objects can only contain JSON values. */
export type JsonObject = { [key: string]: JsonValue }

/** The complete runtime JSON value model. */
export type JsonValue = JsonArray | JsonObject | JsonPrimitive

/**
 * A string that has been produced or validated as serialized JSON.
 *
 * The phantom `__jsonValue` field lets the string remember the value type it represents without affecting runtime output.
 */
export type SerializedJsonString<Type extends JsonValue = JsonValue> = Brand<
    string,
    'SerializedJsonString'
> & {
    readonly __jsonValue?: Type
}

/** A compact serialized JSON string with no pretty-print indentation guarantee. */
export type CompactSerializedJsonString<
    Type extends JsonValue = JsonValue,
> = Brand<SerializedJsonString<Type>, 'CompactSerializedJsonString'>

/** A pretty-printed serialized JSON string. */
export type PrettySerializedJsonString<
    Type extends JsonValue = JsonValue,
> = Brand<SerializedJsonString<Type>, 'PrettySerializedJsonString'>

/** Function values are omitted from JSON object properties and become null in JSON arrays. */
type JsonFunction = (...parameters: Array<never>) => unknown

/** Values that JSON.stringify omits when they appear as object properties. */
type JsonOmittedObjectValue = JsonFunction | symbol | undefined

/** Values that make JSON.stringify throw instead of producing JSON. */
type JsonInvalidValue = bigint

type NonOmittedJsonObjectValue<Type> = Exclude<
    Type,
    JsonOmittedObjectValue
>

type IsNever<Type> = [Type] extends [never] ? true : false

type HasOmittedJsonObjectValue<Type> = [
    Extract<Type, JsonOmittedObjectValue>,
] extends [never]
    ? false
    : true

type JsonifyRequiredObjectKey<Type extends object> = {
    [Key in keyof Type]: IsNever<
        NonOmittedJsonObjectValue<Type[Key]>
    > extends true
        ? never
        : HasOmittedJsonObjectValue<Type[Key]> extends true
          ? never
          : Key
}[keyof Type]

type JsonifyOptionalObjectKey<Type extends object> = {
    [Key in keyof Type]: IsNever<
        NonOmittedJsonObjectValue<Type[Key]>
    > extends true
        ? never
        : HasOmittedJsonObjectValue<Type[Key]> extends true
          ? Key
          : never
}[keyof Type]

/** Object serialization omits undefined, symbol, and function properties. */
type JsonifyObject<Type extends object> = {
    [Key in JsonifyRequiredObjectKey<Type>]: Jsonify<
        NonOmittedJsonObjectValue<Type[Key]>
    >
} & {
    [Key in JsonifyOptionalObjectKey<Type>]?: Jsonify<
        NonOmittedJsonObjectValue<Type[Key]>
    >
}

/** Array serialization keeps the slot but converts undefined, symbol, and function entries to null. */
type JsonifyArrayValue<Type> = Type extends JsonInvalidValue
    ? never
    : Type extends JsonOmittedObjectValue
      ? null
      : Jsonify<Type>

type IsTuple<Type extends readonly unknown[]> = number extends Type['length']
    ? false
    : true

/** Tuple inputs keep their tuple shape; ordinary arrays become ordinary arrays. */
type JsonifyArray<Type extends readonly unknown[]> = IsTuple<Type> extends true
    ? { readonly [Index in keyof Type]: JsonifyArrayValue<Type[Index]> }
    : Array<JsonifyArrayValue<Type[number]>>

/**
 * Type-level approximation of a JSON stringify/parse boundary.
 *
 * Examples:
 *
 * - functions on objects are omitted
 * - functions in arrays become null
 * - Date and other toJSON values become the type returned by toJSON
 * - bigint becomes never because JSON.stringify throws for bigint
 */
export type Jsonify<Type> = Type extends JsonInvalidValue
    ? never
    : Type extends JsonOmittedObjectValue
      ? never
      : Type extends JsonPrimitive
        ? Type
        : Type extends { toJSON: () => infer Jsonified }
          ? Jsonify<Jsonified>
          : Type extends readonly unknown[]
            ? JsonifyArray<Type>
            : Type extends object
              ? JsonifyObject<Type>
              : never

export type JsonGuard<Type extends JsonValue> = (
    value: unknown,
) => value is Type

export type JsonStringifyOptions = {
    /** Number of spaces to use when `pretty` is true. */
    indentSpaces?: number
    /** When true, JSON output is formatted across multiple lines. */
    pretty?: boolean
}

export type JsonNormalizeOptions = {
    /**
     * When true, valid JSON strings are parsed before normalization.
     *
     * This prevents an existing JSON object string from becoming an escaped JSON string of a JSON string.
     */
    parseJsonStrings?: boolean
}

const DEFAULT_INDENT_SPACES = 4

const brandSerializedJsonString = <Type extends JsonValue>(
    value: string,
): SerializedJsonString<Type> => value as SerializedJsonString<Type>

const brandCompactSerializedJsonString = <Type extends JsonValue>(
    value: string,
): CompactSerializedJsonString<Type> =>
    value as CompactSerializedJsonString<Type>

const brandPrettySerializedJsonString = <Type extends JsonValue>(
    value: string,
): PrettySerializedJsonString<Type> =>
    value as PrettySerializedJsonString<Type>

const getJsonIndent = ({
    indentSpaces = DEFAULT_INDENT_SPACES,
    pretty = false,
}: JsonStringifyOptions = {}): number | undefined =>
    pretty ? indentSpaces : undefined

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    if (value === null || typeof value !== 'object') {
        return false
    }

    const prototype = Object.getPrototypeOf(value)

    return prototype === Object.prototype || prototype === null
}

const isJsonValueInternal = (
    value: unknown,
    seen: WeakSet<object>,
): value is JsonValue => {
    if (JsonGuards.primitive(value)) {
        return true
    }

    if (Array.isArray(value)) {
        if (seen.has(value)) {
            return false
        }

        seen.add(value)

        return value.every((entry) => isJsonValueInternal(entry, seen))
    }

    if (isPlainObject(value)) {
        if (seen.has(value)) {
            return false
        }

        seen.add(value)

        return Object.values(value).every((entry) =>
            isJsonValueInternal(entry, seen),
        )
    }

    return false
}

/** Runtime type guards are collected in one namespace so callers can pass them to `parseAs` or `normalizeAs`. */
export namespace JsonGuards {
    /** True for string, finite number, boolean, and null. */
    export const primitive = (value: unknown): value is JsonPrimitive =>
        value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        (typeof value === 'number' && Number.isFinite(value))

    /** True for arrays whose entries are all valid JSON values. */
    export const array = (value: unknown): value is JsonArray =>
        Array.isArray(value) && valueOf(value)

    /** True for plain objects whose entries are all valid JSON values. */
    export const object = (value: unknown): value is JsonObject =>
        isPlainObject(value) && valueOf(value)

    /** True for any valid JSON value. Circular values are rejected. */
    export const valueOf = (value: unknown): value is JsonValue =>
        isJsonValueInternal(value, new WeakSet<object>())

    /** True when a string can be parsed into a valid JSON value. */
    export const serializedString = <Type extends JsonValue = JsonValue>(
        value: string,
    ): value is SerializedJsonString<Type> => parse(value) !== undefined
}

/** Parse JSON text into a validated JSON value. Invalid JSON returns undefined. */
export const parse = (text: string): JsonValue | undefined => {
    try {
        const parsed: unknown = JSON.parse(text)

        return JsonGuards.valueOf(parsed) ? parsed : undefined
    } catch {
        return undefined
    }
}

/** Parse JSON text and then narrow the parsed value with a caller-provided guard. */
export const parseAs = <Type extends JsonValue>(
    text: string,
    guard: JsonGuard<Type>,
): Type | undefined => {
    const parsed = parse(text)

    return guard(parsed) ? parsed : undefined
}

export const parseArray = (text: string): JsonArray | undefined =>
    parseAs(text, JsonGuards.array)

export const parseObject = (text: string): JsonObject | undefined =>
    parseAs(text, JsonGuards.object)

export const parsePrimitive = (text: string): JsonPrimitive | undefined =>
    parseAs(text, JsonGuards.primitive)

/** Stringify an already-validated JSON value. */
export const stringify = <Type extends JsonValue>(
    value: Type,
    options: JsonStringifyOptions = {},
): SerializedJsonString<Type> =>
    brandSerializedJsonString<Type>(
        JSON.stringify(value, undefined, getJsonIndent(options)),
    )

/** Stringify an already-validated JSON value without pretty indentation. */
export const compact = <Type extends JsonValue>(
    value: Type,
): CompactSerializedJsonString<Type> =>
    brandCompactSerializedJsonString<Type>(JSON.stringify(value))

/** Stringify an already-validated JSON value with pretty indentation. */
export const pretty = <Type extends JsonValue>(
    value: Type,
    indentSpaces = DEFAULT_INDENT_SPACES,
): PrettySerializedJsonString<Type> =>
    brandPrettySerializedJsonString<Type>(
        JSON.stringify(value, undefined, indentSpaces),
    )

/**
 * Normalize unknown external input into a JSON value.
 *
 * This is the intentionally permissive boundary:
 *
 * - JSON strings can be parsed first
 * - existing valid JSON values are returned as-is
 * - JSON-serializable objects are stringified and parsed through a JSON boundary
 * - functions, symbols, undefined, circular values, and bigint-only values fail or are omitted like JSON.stringify
 */
export const normalize = (
    input: unknown,
    { parseJsonStrings = true }: JsonNormalizeOptions = {},
): JsonValue | undefined => {
    if (typeof input === 'string' && parseJsonStrings) {
        const parsed = parse(input)

        if (parsed !== undefined) {
            return parsed
        }
    }

    if (JsonGuards.valueOf(input)) {
        return input
    }

    try {
        const serialized = JSON.stringify(input)

        return serialized === undefined ? undefined : parse(serialized)
    } catch {
        return undefined
    }
}

/** Normalize unknown external input and narrow it with a caller-provided guard. */
export const normalizeAs = <Type extends JsonValue>(
    input: unknown,
    guard: JsonGuard<Type>,
    options: JsonNormalizeOptions = {},
): Type | undefined => {
    const normalized = normalize(input, options)

    return guard(normalized) ? normalized : undefined
}

export const normalizeArray = (
    input: unknown,
    options: JsonNormalizeOptions = {},
): JsonArray | undefined => normalizeAs(input, JsonGuards.array, options)

export const normalizeObject = (
    input: unknown,
    options: JsonNormalizeOptions = {},
): JsonObject | undefined => normalizeAs(input, JsonGuards.object, options)

export const normalizePrimitive = (
    input: unknown,
    options: JsonNormalizeOptions = {},
): JsonPrimitive | undefined =>
    normalizeAs(input, JsonGuards.primitive, options)

/** Normalize unknown external input and serialize it if it can safely become JSON. */
export const serialize = (
    input: unknown,
    options: JsonNormalizeOptions & JsonStringifyOptions = {},
): SerializedJsonString | undefined => {
    const normalized = normalize(input, options)

    return normalized === undefined ? undefined : stringify(normalized, options)
}

export const serializeCompact = (
    input: unknown,
    options: JsonNormalizeOptions = {},
): CompactSerializedJsonString | undefined => {
    const normalized = normalize(input, options)

    return normalized === undefined ? undefined : compact(normalized)
}

export const serializePretty = (
    input: unknown,
    options: JsonNormalizeOptions & { indentSpaces?: number } = {},
): PrettySerializedJsonString | undefined => {
    const normalized = normalize(input, options)

    return normalized === undefined
        ? undefined
        : pretty(normalized, options.indentSpaces)
}

/** Convenience namespace-style value export for consumers who prefer grouped helpers. */
export const jsonValue = {
    compact,
    guard: JsonGuards,
    normalize,
    normalizeArray,
    normalizeAs,
    normalizeObject,
    normalizePrimitive,
    parse,
    parseArray,
    parseAs,
    parseObject,
    parsePrimitive,
    pretty,
    serialize,
    serializeCompact,
    serializePretty,
    stringify,
} as const
