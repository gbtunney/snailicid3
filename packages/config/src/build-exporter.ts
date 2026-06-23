import { ApiExtractor } from './api-extractor/index.js'
import { Markdownlint } from './markdownlint/index.js'
import { json } from './utilities/json.js'
import { Prettier } from './index.js'
/* TODO: outputs a json dump of markdownlint and prettier. this is TEMPORARY till the configs are correct. ideally this should be gotten rid of */

const cwd = process.cwd()

const API_EXTRACTOR_CONFIG = json.object(ApiExtractor.config({ cwd })) ?? {}

const MARKDOWN_LINT_CONFIG = json.object(Markdownlint.config({ cwd })) ?? {}

const PRETTIER_CONFIG = json.object(Prettier.configFile({ cwd })) ?? {}

/** As const */
const JSON_EXPORTS = [
    {
        data: PRETTIER_CONFIG,
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
