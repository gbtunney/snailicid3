import { merge as deep_merge } from 'ts-deepmerge'
import type {
    JsonArray,
    Jsonifiable,
    JsonObject,
    JsonPrimitive,
    JsonValue,
    UnknownRecord,
} from 'type-fest'
import fs from 'node:fs'
import path from 'node:path'
export type MergeArrayModes = 'append' | 'replace'
export type PlainObject = {
    [x: string]: unknown
    [y: number]: never
}
export const deepMerge = <Type extends Array<PlainObject>>(
    array_mode: MergeArrayModes = 'append',
    ...value: Array<PlainObject>
): PlainObject => {
    return array_mode === 'append'
        ? deep_merge.withOptions({ mergeArrays: true }, ...value)
        : deep_merge.withOptions({ mergeArrays: false }, ...value)
}

type TraceLogger = {
    error: (...args: Array<unknown>) => void
}

const getTraceLogger = (scope: string): TraceLogger => {
    const label = `[@snailicid3/config:${scope}]`

    return {
        error: (...args: Array<unknown>): void => {
            console.error(label, ...args)
            console.trace(label)
        },
    }
}

export namespace Json {
    export type Array = JsonArray
    export type Object = JsonObject
    export type Primitive = JsonPrimitive
    export type Value = Exclude<JsonValue, null>
}

export const isPlainObject = <Type extends UnknownRecord = UnknownRecord>(
    value: unknown,
): value is Type => {
    if (value === null || typeof value !== 'object') {
        return false
    }

    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
}

export const safeDeserializeJSON = <Type extends JsonValue = JsonValue>(
    data: unknown,
): Type | undefined => {
    const logger = getTraceLogger('safeDeserializeJSON')

    try {
        return JSON.parse(JSON.stringify(data)) as Type
    } catch {
        logger.error('JSON deserialization failed for data:', data)
        return undefined
    }
}

export function serializeJSON<Type extends Jsonifiable = Jsonifiable>(
    value: unknown,
): string {
    if (typeof value !== 'string') {
        return JSON.stringify(value, undefined, 4)
    }

    try {
        JSON.parse(value)

        return value
    } catch {
        return JSON.stringify(value)
    }
}

/**
 * PrettyPrint a JSON object.
 *
 * @category Json
 */
export const prettyPrintJSON = <Type extends Jsonifiable>(
    value: Type,
    indentSpaces = 4,
): string => {
    return JSON.stringify(
        JSON.parse(JSON.stringify(value)),
        undefined,
        indentSpaces,
    )
}

export const importJSON = async (
    filename: string,
): Promise<JsonValue | undefined> => {
    const absolutePath = path.resolve(filename)
    const logger = getTraceLogger('importJSON')

    if (!fs.existsSync(absolutePath)) {
        logger.error(`File not found: ${absolutePath}`)
        return undefined
    }

    try {
        const rawData = await fs.promises.readFile(absolutePath, 'utf8')
        const parsedData: unknown = JSON.parse(rawData)

        if (Array.isArray(parsedData)) {
            return parsedData as JsonArray
        }

        if (isPlainObject(parsedData)) {
            return parsedData as JsonObject
        }

        if (
            parsedData === null ||
            typeof parsedData === 'string' ||
            typeof parsedData === 'number' ||
            typeof parsedData === 'boolean'
        ) {
            return parsedData
        }

        return parsedData as JsonValue
    } catch (error) {
        logger.error(`Failed to parse JSON file: ${absolutePath}`, error)
        return undefined
    }
}

export type JSONExportConfig = Array<JSONExportEntry>

export type JSONExportEntry<Type extends Jsonifiable = JsonValue> = {
    data: Type
    filename: string
}

/** Throws error if file save fails */
export const exportJSONFile = (
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

            const writeFile = (filePath: string = file_path): void => {
                fs.mkdirSync(path.dirname(filePath), { recursive: true })
                fs.writeFileSync(filePath, prettyPrintJSON(entry.data))
            }
            const logObject = logData ? `\n${serializeJSON(entry.data)}` : ''

            if (overwrite) {
                writeFile()
                console.log(
                    `Writing file to (${fs.existsSync(file_path) ? 'existing' : 'empty'}) path: ${file_path}`,
                    logObject,
                )
            } else if (!overwrite && !fs.existsSync(file_path)) {
                writeFile()
                console.log(
                    `Writing file to (empty) path: ${file_path}`,
                    logObject,
                )
            } else if (!overwrite && fs.existsSync(file_path)) {
                const errorMessage = `FILE WRITE ERROR: ${file_path}, file already exists`
                console.error(errorMessage, logObject)
                success = errorMessage
            } else {
                const errorMessage = `UNKNOWN ERROR: write to ${fs.existsSync(file_path) ? 'EXISTING' : 'EMPTY'} path ${file_path} failed`
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

    if (logData)
        console.log(
            'Status::::\n',
            prettyPrintJSON(Object.values(result_status)),
        )

    const success = Array.from(Object.entries(result_status)).reduce<boolean>(
        (status, [, value]) => (!status ? false : value === true),
        true,
    )
    if (!success) throw new Error(prettyPrintJSON(Object.values(result_status)))

    return success
}
