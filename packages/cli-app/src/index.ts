export type {
    AppConfig,
    AppConfigIn,
    AppConfigOut,
    AppConfigSchema,
    appConfigSchema,
} from './app/config.js'
export { parsePackageJson } from './app/config.js'
export type { InitSuccessCallback } from './app/init.js'
export { initApp, initializeApp } from './app/init.js'
export { commonFlagsSchema } from './schema/common-flags.js'
export type {
    CommonFlagsInput,
    CommonFlagsOutput,
    CommonFlagsSchema,
} from './schema/common-flags.js'
export { wrapSchema } from './schema/utils.js'
export type { WrappedSchema, ZodObjectSchema } from './schema/utils.js'
export {
    createProgressBar,
    createSpinner,
    type ProgressBar,
    type Spinner,
    type SpinnerOptions,
    type SpinnerStatus,
} from '@snailicid3/logger'

// ── Terminal output ──────────────────────────────────────────────────────────
// A curated slice of the logger's terminal surface, so a CLI does not reach past cli-app for the
// formatting it needs. Deliberately not a re-export of raw Ansis: consumers get the helpers that
// respect the logger's colour handling, not an unbounded styling library.
export {
    type AnsiColorPreset,
    block,
    type BlockOptions,
    getColorAnsiInstance,
    header,
    isAnsiColorPreset,
    type KeyValuePairOptions,
    kvPair,
    line,
    type LoggerColor,
    rule,
    type RuleOptions,
    section,
    spacer,
    statusPair,
    type StatusPairOptions,
    step,
    stripAnsi,
    styleText,
    subheader,
    table,
    type TableOptions,
    type TableRow,
    terminalLink,
    type TerminalStyle,
    visibleLength,
    wrapColorAnsiText,
} from '@snailicid3/logger'

export { isPlainObject, json } from '@snailicid3/node-utils'
export type {
    Json,
    JSONExportConfig,
    JSONExportEntry,
    Jsonifiable,
} from '@snailicid3/node-utils'
export {
    doesFileExist,
    getDirname,
    getExt,
    getFilename,
    getFilePath,
    getFullPath,
    normalizePath,
    paths,
    resolveCwd,
} from '@snailicid3/node-utils'
export {
    fsPath,
    fsPathArray,
    fsPathArrayHasFiles,
    fsPathExists,
    fsPathTypeExists,
    fsTypedPath,
} from '@snailicid3/node-utils'
