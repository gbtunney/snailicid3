import type { JsonObject } from 'type-fest'
import { apiExtractor } from './api-extractor/index.js'
import { markdownlint } from './markdownlint/index.js'
import { getPrettierPluginsList } from './prettier/plugins.js'
import { exportJSONFile, isPlainObject } from './utilities/json.js'
import { Prettier } from './index.js'
/* TODO: outputs a json dump of markdownlint and prettier. this is TEMPORARY till the configs are correct. ideally this should be gotten rid of */

const _apiExtractorConfig = apiExtractor.config()
const API_EXTRACTOR_CONFIG = isPlainObject<JsonObject>(_apiExtractorConfig)
    ? _apiExtractorConfig
    : {}

// Debug: log what will be written
console.log(
    '[build-exporter] API_EXTRACTOR_CONFIG keys:',
    Object.keys(API_EXTRACTOR_CONFIG),
)
console.log(
    '[build-exporter] API_EXTRACTOR_CONFIG preview:',
    JSON.stringify(API_EXTRACTOR_CONFIG, null, 2).slice(0, 400),
)

const MARKDOWN_LINT_CONFIG = isPlainObject<JsonObject>(markdownlint.config())
    ? markdownlint.config()
    : {}

const _prettierMergedConfig = {
    ...Prettier.configuration(),
    // Build artifact must keep plugin package names, not bundled plugin objects.
    plugins: getPrettierPluginsList(),
}
const _prettierConfig = isPlainObject<JsonObject>(_prettierMergedConfig)
    ? _prettierMergedConfig
    : {}

/** As const */
const JSON_EXPORTS = [
    {
        data: _prettierConfig,
        filename: 'dist/.prettierrc.json',
    },
    {
        data: MARKDOWN_LINT_CONFIG,
        filename: 'dist/.markdownlint.json',
    },

    {
        data: API_EXTRACTOR_CONFIG,
        filename: 'dist/.api-extractor-base.json',
    },
]

exportJSONFile(JSON_EXPORTS, '.')
