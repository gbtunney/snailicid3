import { type Json } from '@snailicid3/types'
import { type Jsonifiable, type Tagged } from 'type-fest'
import { compact, normalize, pretty } from './json-value.js'
import { isJsonifiable, isJsonValue } from '../typeguard/json.typeguards.js'

/**
 * PrettyPrint a JSON value.
 *
 * Normalizes the input first (parsing already-serialized JSON strings) so a value that is already a JSON string is not
 * double-serialized into escaped garbage.
 *
 * @category Json
 */
export const prettyPrintJSON = <Type extends Jsonifiable>(
    value: Type,
    indentSpaces = 4,
): string => {
    const normalized = normalize(value) ?? null

    return indentSpaces > 0
        ? pretty(normalized, indentSpaces)
        : compact(normalized)
}

/**
 * Safely serializes a JSON object, with an option for pretty printing.
 *
 * @category Json
 */
export const safeSerializeJson = <Type extends Jsonifiable>(
    data: Type,
    prettyPrint: boolean = true,
): string =>
    isJsonifiable<Type>(data)
        ? prettyPrintJSON<Type>(data, prettyPrint ? 4 : 0)
        : /* eslint  @typescript-eslint/restrict-template-expressions:"warn",@typescript-eslint/no-base-to-string:"warn" */
          `Error serializing JSON:: ${data}`

/**
 * Safely deserializes a JSON string.
 *
 * @category Json
 */
export const safeDeserializeJson = (data: string): Json.Value | undefined => {
    try {
        const json_value = JSON.parse(data)
        if (isJsonValue<Json.Value>(json_value)) {
            return json_value
        }
    } catch (e) {
        console.error(e)
    }
    return undefined
}
//Todo: finish these functions
export type JsonOf<Type> = Tagged<string, 'JSON', Type>
