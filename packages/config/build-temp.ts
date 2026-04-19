import { Prettier } from './src/index.js'
import { getPrettierPluginsList } from './src/prettier/plugins.js'
import type { Jsonify, JsonObject } from 'type-fest'
import { exportJSONFile } from './src/export.json.file.js'
import {
    markdownLintConfigJson,
    MarkdownlintConfiguration,
} from './src/markdownlint/index.js'

/* TODO: outputs a json dump of markdownlint and prettier. this is TEMPORARY till the configs are correct. ideally this should be gotten rid of */

const MARKDOWN_LINT_OPTIONS: MarkdownlintConfiguration = { config: {} }
const _mdConfig = await markdownLintConfigJson(MARKDOWN_LINT_OPTIONS)
const mdConfig: JsonObject = _mdConfig !== undefined ? _mdConfig : {}

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
