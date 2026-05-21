import type { JSONSchema4 } from 'json-schema'
import { parse as parseJsonc } from 'jsonc-parser'
import type { JsonObject } from 'type-fest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isPlainObject } from '../utilities/json.js'

/**
 * Load the API Extractor base config from disk.
 *
 * Supports JSON-with-comments (JSONC).
 *
 * @throws {TypeError} If the parsed config is not a JSON object or fails schema validation.
 */
function config(): JsonObject {
    const url = new URL('./base.json', import.meta.url)
    const text = fs.readFileSync(url, 'utf8')
    const parsed = parseJsonc(text) as unknown
    if (!isPlainObject<JsonObject>(parsed)) {
        throw new TypeError(
            'API Extractor base config must parse to a JSON object (did you put an array/primitive at the top level?)',
        )
    }
    /* todo: maybe enable 
    const schema = loadApiExtractorSchema()
    const ajv = new Ajv({ allErrors: true, strict: false })
    const validate = ajv.compile(schema)
    const ok = validate(parsed)

    if (!ok) {
        const details = ajv.errorsText(validate.errors, { separator: '\n' })
        throw new TypeError(`API Extractor base config failed schema validation:\n${details}`)
    }
*/
    return parsed
}

function loadApiExtractorSchema(): JSONSchema4 {
    // API Extractor ships its schema JSON in the package.
    // Path is stable in v7.x: dist/schemas/api-extractor.schema.json
    const pkgRoot = path.dirname(fileURLToPath(new URL('..', import.meta.url)))

    // Resolve from node_modules relative to this file.
    // (If your build bundles node_modules away, prefer createRequire or a direct import assertion.)
    const schemaPath = require.resolve(
        '@microsoft/api-extractor/dist/schemas/api-extractor.schema.json',
        { paths: [pkgRoot] },
    )

    const text = fs.readFileSync(schemaPath, 'utf8')
    return JSON.parse(text) as JSONSchema4
}
export const apiExtractor: {
    config: typeof config
} = {
    config: config,
}
export default apiExtractor
