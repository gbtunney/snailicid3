import fs from 'node:fs'
import path from 'node:path'
import { merge as deep_merge } from 'ts-deepmerge'
import type {
    JsonArray,
    JsonObject,
    JsonPrimitive,
    JsonValue,
    Tagged,
} from 'type-fest'

export type MergeArrayModes = 'append' | 'replace'
export type PlainObject = object
export type JSONSerializeOptions = {
    indentSpaces?: number
    pretty?: boolean
}
export type JSONStringOf<Type extends JsonValue = JsonValue> = Tagged<
    string,
    'JSON_STRING',
    Type
>

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

export namespace Json {
    export type Array = JsonArray
    export type Object = JsonObject
    export type Primitive = JsonPrimitive
    export type StringOf<Type extends JsonValue = JsonValue> = JSONStringOf<Type>
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

const toJSONString = <Type extends JsonValue>(value: string): JSONStringOf<Type> =>
    value as JSONStringOf<Type>

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
        JSON.stringify(value, undefined, getJSONIndentSpaces(options)) ?? 'null',
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

export type JSONExportConfig = Array<JSONExportEntry>

export type JSONExportEntry<Type = unknown> = {
    data: Type
    filename: string
}

const exportJSONFile = (
    config: JSONExportConfig,
    outdir?: string,
    /** File overwrite mode if exists */
    overwrite: boolean = true,
    logData: boolean = false,
): boolean => {
    const result_status = config.reduce<Record<string, string | true>>(
        (acc, entry: JSONExportEntry) => {
            let success: string | true = true
            const file_name =
                entry.filename.endsWith('.json') ||
                entry.filename.endsWith('json')
                    ? entry.filename
                    : `${entry.filename}.json`
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

            try {
                if (overwrite) {
                    success = writeFile()

                    if (success === true) {
                        console.log(
                            `Writing file to (${fs.existsSync(file_path) ? 'existing' : 'empty'}) path: ${file_path}`,
                            logObject,
                        )
                    } else {
                        console.error(success, logObject)
                    }
                } else if (!overwrite && !fs.existsSync(file_path)) {
                    success = writeFile()

                    if (success === true) {
                        console.log(
                            `Writing file to (empty) path: ${file_path}`,
                            logObject,
                        )
                    } else {
                        console.error(success, logObject)
                    }
                } else if (!overwrite && fs.existsSync(file_path)) {
                    const errorMessage = `FILE WRITE ERROR: ${file_path}, file already exists`
                    console.error(errorMessage, logObject)
                    success = errorMessage
                } else {
                    const errorMessage = `UNKNOWN ERROR: write to ${fs.existsSync(file_path) ? 'EXISTING' : 'EMPTY'} path ${file_path} failed`
                    console.error(errorMessage, logObject)
                    success = errorMessage
                }
            } catch (error: unknown) {
                const errorMessage = `FILE WRITE ERROR: ${file_path}, ${formatUnknownError(error)}`
                console.error(errorMessage, logObject)
                success = errorMessage
            }

            return {
                ...acc,
                [file_path]: success,
            }
        },
        {},
    )

    if (logData) {
        console.log(
            'Status::::\n',
            prettyPrintJSON(Object.values(result_status)),
        )
    }

    const success = Array.from(Object.entries(result_status)).reduce<boolean>(
        (status, [, value]) => (!status ? false : value === true),
        true,
    )
    if (!success) throw new Error(prettyPrintJSON(Object.values(result_status)))

    return success
}

export type JsonUtilities = {
    deserialize: (data: unknown) => JsonValue | undefined
    deserializeObject: (data: unknown) => JsonObject | undefined
    exportFile: (
        config: JSONExportConfig,
        outdir?: string,
        overwrite?: boolean,
        logData?: boolean,
    ) => boolean
    importFile: (filename: string) => Promise<JsonValue | undefined>
    importObject: (filename: string) => Promise<JsonObject | undefined>
    isObject: (value: unknown) => value is JsonObject
    isValue: (value: unknown) => value is JsonValue
    object: (data: unknown) => JsonObject | undefined
    prettyPrint: (value: unknown, indentSpaces?: number) => JSONStringOf
    serialize: (
        value: unknown,
        options?: JSONSerializeOptions,
    ) => JSONStringOf
}

export const json: JsonUtilities = {
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
