import type { JsonObject } from 'type-fest'
import { ApiExtractor } from './api-extractor/index.js'
import { Markdownlint } from './markdownlint/index.js'
import { getDefaultPrettierPluginNames } from './prettier/plugins/index.js'
import { isPlainObject, json } from './utilities/json.js'
import { Prettier } from './index.js'
/* TODO: outputs a json dump of markdownlint and prettier. this is TEMPORARY till the configs are correct. ideally this should be gotten rid of */

const _apiExtractorConfig = ApiExtractor.config()
const API_EXTRACTOR_CONFIG = isPlainObject<JsonObject>(_apiExtractorConfig)
    ? _apiExtractorConfig
    : {}

const MARKDOWN_LINT_CONFIG = isPlainObject<JsonObject>(Markdownlint.config())
    ? Markdownlint.config()
    : {}

const _prettierMergedConfig = {
    ...Prettier.config(),
    // Build artifact must keep plugin package names, not resolved plugin objects.
    plugins: getDefaultPrettierPluginNames(),
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

json.exportFile(JSON_EXPORTS, '.')
