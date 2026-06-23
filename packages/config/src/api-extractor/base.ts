import { parse as parseJsonc } from 'jsonc-parser'
import type { JsonObject } from 'type-fest'
import fs from 'node:fs'
import { isPlainObject } from '../utilities/json.js'

/**
 * Load the API Extractor base config from disk.
 *
 * Supports JSON-with-comments (JSONC).
 *
 * @throws {TypeError} If the parsed config is not a JSON object.
 */
export function getBaseConfig(): JsonObject {
    const url = new URL('./base.json', import.meta.url)
    const text = fs.readFileSync(url, 'utf8')
    const parsed = parseJsonc(text) as unknown

    if (!isPlainObject<JsonObject>(parsed)) {
        throw new TypeError(
            'API Extractor base config must parse to a JSON object (did you put an array/primitive at the top level?)',
        )
    }

    return parsed
}
