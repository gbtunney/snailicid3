import type { JsonObject } from 'type-fest'
import { exportJSONFile } from './export.json.file.js'
import { markdownlint } from './markdownlint/index.js'
import { getPrettierPluginsList } from './prettier/plugins.js'
import { isPlainObject } from './utilities.js'
import { Prettier } from './index.js'
/* TODO: outputs a json dump of markdownlint and prettier. this is TEMPORARY till the configs are correct. ideally this should be gotten rid of */

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
]

exportJSONFile(JSON_EXPORTS, '.')
