import type {
    ArrayValues,
    JsonArray,
    JsonObject,
    JsonPrimitive,
    JsonValue,
    ReadonlyDeep,
    UnknownRecord,
} from 'type-fest'
import fs from 'fs'
import { fileURLToPath } from 'node:url'
import path from 'path'

export const JS_FILE_EXTENSIONS = ['js', 'mjs', 'cjs', 'jsx'] as const
export const TS_FILE_EXTENSIONS = ['ts', 'mts', 'cts', 'tsx'] as const
export const JSLIKE_FILE_EXTENSIONS = [
    ...JS_FILE_EXTENSIONS,
    ...TS_FILE_EXTENSIONS,
] as const

export type JSFileExtensions = ArrayValues<typeof JS_FILE_EXTENSIONS>
export type TSFileExtensions = ArrayValues<typeof TS_FILE_EXTENSIONS>
export type JSLikeFileExtensions = ArrayValues<typeof JSLIKE_FILE_EXTENSIONS>

export type AllowedExtensions =
    | Array<JSLikeFileExtensions>
    | ReadonlyDeep<Array<JSLikeFileExtensions>>

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

export const getFileExtensionList = (
    extensions: AllowedExtensions,
    joined: boolean = true,
    prefix: string = '',
): Array<string> => {
    const values = extensions.map((value: string): string => {
        return `${prefix}${value}`
    })

    return joined ? [values.join(',')] : values
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
            return parsedData as JsonPrimitive
        }

        return parsedData as JsonValue
    } catch (error) {
        logger.error(`Failed to parse JSON file: ${absolutePath}`, error)
        return undefined
    }
}

export const getFilePath = (meta: ImportMeta, filePath: string): string => {
    const directoryPath = path.dirname(fileURLToPath(meta.url))

    if (!fs.existsSync(path.resolve(directoryPath))) {
        throw new Error(
            `Directory does not exist: ${path.resolve(directoryPath)}`,
        )
    }

    return path.resolve(`${directoryPath}/${filePath}`)
}
