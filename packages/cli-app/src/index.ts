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
