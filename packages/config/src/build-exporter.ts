import type { Jsonify, JsonObject } from 'type-fest'
import { exportJSONFile } from './export.json.file.js'
import {
    markdownlint,
    type MarkdownlintConfiguration,
} from './markdownlint/index.js'
import { getPrettierPluginsList } from './prettier/plugins.js'
import { safeDeserializeJSON } from './utilities.js'
import { Prettier } from './index.js'

/* TODO: outputs a json dump of markdownlint and prettier. this is TEMPORARY till the configs are correct. ideally this should be gotten rid of */

const MARKDOWN_LINT_CONFIG: MarkdownlintConfiguration = markdownlint.config()
const _mdConfig: JsonObject | undefined = safeDeserializeJSON<JsonObject>(
    JSON.stringify(MARKDOWN_LINT_CONFIG),
)
const mdConfig: JsonObject = _mdConfig ? _mdConfig : {}

const _prettierConfig = JSON.parse(
    JSON.stringify({
        ...Prettier.configuration(),
        // Build artifact must keep plugin package names, not bundled plugin objects.
        plugins: getPrettierPluginsList(),
    }),
)
const prettierConfig: Jsonify<typeof _prettierConfig> = _prettierConfig

/** As const */
const JSON_EXPORTS = [
    {
        data: prettierConfig,
        filename: 'dist/.prettierrc.json',
    },
    {
        data: mdConfig,
        filename: 'dist/.markdownlint.json',
    },
]

exportJSONFile(JSON_EXPORTS, '.')
