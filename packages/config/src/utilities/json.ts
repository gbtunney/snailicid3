import { merge as deep_merge } from 'ts-deepmerge'
import type {
    JsonArray,
    JsonObject,
    JsonPrimitive,
    JsonValue,
    Tagged,
} from 'type-fest'
import fs from 'node:fs'
import path from 'node:path'

/** Options used when converting JSON-compatible values to strings. */
export type JSONSerializeOptions = {
    /** Number of spaces to use when `pretty` is enabled. */
    indentSpaces?: number
    /** When true, format the JSON string with indentation. */
    pretty?: boolean
}

/** Branded JSON string produced by the JSON utility helpers. */
export type JSONStringOf<Type extends JsonValue = JsonValue> = Tagged<
    string,
    'JSON_STRING',
    Type
>

/** How object merging should treat array properties. */
export type MergeArrayModes = 'append' | 'replace'
export type PlainObject = object

type PlainRecord = Record<string, unknown>

export const isPlainObject = <Type extends PlainObject = PlainRecord>(
    value: unknown,
): value is Type => {
    if (value === null || typeof value !== 'object') {
        return false
    }

    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
}

export const deepMerge = (
    array_mode: MergeArrayModes = 'append',
    ...value: Array<PlainObject>
): PlainObject => {
    const mergeableValues = value.filter(isPlainObject<PlainRecord>)
    const result =
        array_mode === 'append'
            ? deep_merge.withOptions({ mergeArrays: true }, ...mergeableValues)
            : deep_merge.withOptions({ mergeArrays: false }, ...mergeableValues)

    return isPlainObject(result) ? result : {}
}

type TraceLogger = {
    error: (...args: Array<unknown>) => void
}

const DEFAULT_JSON_INDENT_SPACES = 4

const getTraceLogger = (scope: string): TraceLogger => {
    const label = `[@snailicid3/config:${scope}]`

    return {
        error: (...args: Array<unknown>): void => {
            console.error(label, ...args)
            console.trace(label)
        },
    }
}

const formatUnknownError = (error: unknown): string =>
    error instanceof Error ? error.message : String(error)

/** Type aliases for JSON-compatible values. */
export namespace Json {
    /** JSON-compatible array value. */
    export type Array = JsonArray
    /** JSON-compatible object value. Arrays are not objects here. */
    export type Object = JsonObject
    /** JSON-compatible primitive value: string, number, boolean, or null. */
    export type Primitive = JsonPrimitive
    /** Branded JSON string produced by `json.serialize()` or `json.prettyPrint()`. */
    export type StringOf<Type extends JsonValue = JsonValue> =
        JSONStringOf<Type>
    /** Any JSON-compatible value: object, array, string, number, boolean, or null. */
    export type Value = JsonValue
}

export const isJsonPrimitive = (value: unknown): value is JsonPrimitive =>
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))

const isJsonValueInternal = (
    value: unknown,
    seen: WeakSet<object>,
): value is JsonValue => {
    if (isJsonPrimitive(value)) {
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

export const isJsonValue = (value: unknown): value is JsonValue =>
    isJsonValueInternal(value, new WeakSet<object>())

export const isJsonArray = (value: unknown): value is JsonArray =>
    Array.isArray(value) && isJsonValue(value)

export const isJsonObject = (value: unknown): value is JsonObject =>
    isPlainObject(value) && isJsonValue(value)

const toJSONString = <Type extends JsonValue>(
    value: string,
): JSONStringOf<Type> => value as JSONStringOf<Type>

const parseJSONString = (data: string): JsonValue | undefined => {
    try {
        const parsed: unknown = JSON.parse(data)
        return isJsonValue(parsed) ? parsed : undefined
    } catch {
        return undefined
    }
}

const deserializeJSON = (data: unknown): JsonValue | undefined => {
    if (typeof data === 'string') {
        return parseJSONString(data) ?? data
    }

    try {
        const serialized = JSON.stringify(data)

        if (serialized === undefined) {
            return undefined
        }

        return parseJSONString(serialized)
    } catch {
        return undefined
    }
}

const deserializeJSONObject = (data: unknown): JsonObject | undefined => {
    const parsed = deserializeJSON(data)
    return isJsonObject(parsed) ? parsed : undefined
}

const getJSONIndentSpaces = ({
    indentSpaces = DEFAULT_JSON_INDENT_SPACES,
    pretty = false,
}: JSONSerializeOptions = {}): number => (pretty ? indentSpaces : 0)

const stringifyJSONValue = <Type extends JsonValue>(
    value: Type,
    options: JSONSerializeOptions = {},
): JSONStringOf<Type> =>
    toJSONString<Type>(
        JSON.stringify(value, undefined, getJSONIndentSpaces(options)) ??
            'null',
    )

function serializeJSON(
    value: unknown,
    options: JSONSerializeOptions = {},
): JSONStringOf {
    const parsed = deserializeJSON(value)

    return parsed === undefined
        ? stringifyJSONValue(String(value), options)
        : stringifyJSONValue(parsed, options)
}

const prettyPrintJSON = (
    value: unknown,
    indentSpaces = DEFAULT_JSON_INDENT_SPACES,
): JSONStringOf => serializeJSON(value, { indentSpaces, pretty: true })

/**
 * TODO can we make a isjsonifiable function for stirng,null,etc and these should use the serialize function ? also
 * paths should reso
 */
const importJSON = async (filename: string): Promise<JsonValue | undefined> => {
    const absolutePath = path.resolve(filename)
    const logger = getTraceLogger('importJSON')

    if (!fs.existsSync(absolutePath)) {
        logger.error(`File not found: ${absolutePath}`)
        return undefined
    }

    try {
        const rawData = await fs.promises.readFile(absolutePath, 'utf8')
        const parsedData = parseJSONString(rawData)

        if (parsedData === undefined) {
            logger.error(`File did not contain valid JSON: ${absolutePath}`)
        }

        return parsedData
    } catch (error: unknown) {
        logger.error(`Failed to parse JSON file: ${absolutePath}`, error)
        return undefined
    }
}

const importJSONObject = async (
    filename: string,
): Promise<JsonObject | undefined> => {
    const parsed = await importJSON(filename)
    return isJsonObject(parsed) ? parsed : undefined
}

/** List of JSON files to write with `json.exportFile()`. */
export type JSONExportConfig = Array<JSONExportEntry>

/** One JSON file output entry for `json.exportFile()`. */
export type JSONExportEntry<Type = unknown> = {
    /** JSON-serializable data to write. */
    data: Type
    /** Output filename. `.json` is appended when omitted. */
    filename: string
}

type JSONExportStatus = Record<string, string | true>

const getJSONExportFileName = (filename: string): string =>
    filename.endsWith('.json') || filename.endsWith('json')
        ? filename
        : `${filename}.json`

const exportJSONFile = (
    config: JSONExportConfig,
    outdir?: string,
    /** File overwrite mode if exists */
    overwrite: boolean = true,
    logData: boolean = false,
): boolean => {
    const result_status: JSONExportStatus = {}

    for (const entry of config) {
        const file_name = getJSONExportFileName(entry.filename)
        const file_path = outdir
            ? path.resolve(outdir, file_name)
            : path.resolve(file_name)
        const parsedData = deserializeJSON(entry.data)
        const logObject =
            logData && parsedData !== undefined
                ? `\n${stringifyJSONValue(parsedData)}`
                : ''

        const writeFile = (filePath: string = file_path): string | true => {
            if (parsedData === undefined) {
                return `FILE WRITE ERROR: ${file_path}, data is not JSON serializable`
            }

            fs.mkdirSync(path.dirname(filePath), { recursive: true })
            fs.writeFileSync(
                filePath,
                stringifyJSONValue(parsedData, { pretty: true }),
            )
            return true
        }

        let success: string | true

        try {
            const fileExists = fs.existsSync(file_path)

            if (!overwrite && fileExists) {
                success = `FILE WRITE ERROR: ${file_path}, file already exists`
                console.error(success, logObject)
            } else {
                success = writeFile()

                if (success === true) {
                    console.log(
                        `Writing file to (${fileExists ? 'existing' : 'empty'}) path: ${file_path}`,
                        logObject,
                    )
                } else {
                    console.error(success, logObject)
                }
            }
        } catch (error: unknown) {
            success = `FILE WRITE ERROR: ${file_path}, ${formatUnknownError(error)}`
            console.error(success, logObject)
        }

        result_status[file_path] = success
    }

    if (logData) {
        console.log(
            'Status::::\n',
            prettyPrintJSON(Object.values(result_status)),
        )
    }

    let success = true
    for (const status of Object.values(result_status)) {
        if (status !== true) {
            success = false
            break
        }
    }

    if (!success) throw new Error(prettyPrintJSON(Object.values(result_status)))

    return success
}

export const json: {
    /**
     * Convert unknown in-memory data into a JSON-compatible value.
     *
     * Use this when the input is already in memory. Strings are parsed as JSON when possible; non-JSON strings remain
     * strings. Arrays are allowed. For reading from disk, use `json.importFile()` instead.
     */
    deserialize: (data: unknown) => JsonValue | undefined

    /**
     * Convert unknown in-memory data into a JSON object only.
     *
     * This rejects arrays and primitives. It is the verbose alias of `json.object()`.
     */
    deserializeObject: (data: unknown) => JsonObject | undefined

    /**
     * Write one or more JSON files to disk.
     *
     * Use this for generated JSON artifacts. Each entry filename receives a `.json` suffix when one is not already
     * present.
     */
    exportFile: (
        config: JSONExportConfig,
        outdir?: string,
        overwrite?: boolean,
        logData?: boolean,
    ) => boolean

    /**
     * Read and parse a JSON file from disk.
     *
     * Use this when any JSON value is acceptable: object, array, string, number, boolean, or null. For in-memory data,
     * use `json.deserialize()`.
     */
    importFile: (filename: string) => Promise<JsonValue | undefined>

    /**
     * Read and parse a JSON file from disk, requiring an object result.
     *
     * Use this for package/config JSON files where arrays and primitives should be rejected.
     */
    importObject: (filename: string) => Promise<JsonObject | undefined>

    /** Check whether a value is a JSON object. Arrays are rejected. */
    isObject: (value: unknown) => value is JsonObject

    /** Check whether a value is any JSON-compatible value. Arrays are allowed. */
    isValue: (value: unknown) => value is JsonValue

    /**
     * Convert unknown in-memory data into a JSON object only.
     *
     * Short alias for `json.deserializeObject()`. This parses JSON strings and accepts plain objects, but rejects
     * arrays and primitives. For file IO, use `json.importObject()`.
     */
    object: (data: unknown) => JsonObject | undefined

    /** Serialize data as formatted JSON using the provided indentation width. */
    prettyPrint: (value: unknown, indentSpaces?: number) => JSONStringOf

    /**
     * Serialize unknown in-memory data to a branded JSON string.
     *
     * Use this when you need JSON text output. Pass `{ pretty: true }` or use `json.prettyPrint()` for indented output.
     */
    serialize: (value: unknown, options?: JSONSerializeOptions) => JSONStringOf
} = {
    deserialize: deserializeJSON,
    deserializeObject: deserializeJSONObject,
    exportFile: exportJSONFile,
    importFile: importJSON,
    importObject: importJSONObject,
    isObject: isJsonObject,
    isValue: isJsonValue,
    object: deserializeJSONObject,
    prettyPrint: prettyPrintJSON,
    serialize: serializeJSON,
}

export type { Jsonifiable } from 'type-fest'
