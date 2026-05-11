import type {
    JsonArray,
    Jsonifiable,
    JsonObject,
    JsonValue,
    UnknownRecord,
} from 'type-fest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
    // already object/array/etc
    if (typeof value !== 'string') {
        // serialize normally
        return JSON.stringify(value, undefined, 4)
    }
    try {
        // test whether string is already valid JSON
        JSON.parse(value)

        // already serialized JSON string
        // return unchanged to avoid double stringify
        return value
    } catch {
        // raw non-json string
        // serialize into valid JSON string
        return JSON.stringify(value)
    }
}

/**
 * TODO idk isnt this more of a node-utls function? and the next one? Idk export is not actually exported from this
 * package export.json.file is more of a node-utils thing too and should probably be moved? i am confused. :(
 */
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

export const getFilePath = (meta: ImportMeta, filePath: string): string => {
    const directoryPath = path.dirname(fileURLToPath(meta.url))

    if (!fs.existsSync(path.resolve(directoryPath))) {
        throw new Error(
            `Directory does not exist: ${path.resolve(directoryPath)}`,
        )
    }

    return path.resolve(`${directoryPath}/${filePath}`)
}
