/* * NODE UTILITIES * */
import { z } from 'zod'

import { getImageBase64 } from './encode-base64.js'
import { exportJSONFile } from './export.json.file.js'
import * as filePath from './file.path.array.js'
import * as typedPath from './path.typed.js'
import * as zod_fs_schema from './zod.node.js'

/** @internal */
export const zod: typeof z & typeof zod_fs_schema = {
    ...z,
    ...zod_fs_schema,
}

/** @namespace Functions pertaining to nodejs files and path resolution */
export const node = {
    exportJSONFile,
    getImageBase64,
    ...zod_fs_schema,
    ...filePath,
    ...typedPath,
}
export default node
export * from './argv.js'

export * from './command.js'
/* * TYPES * */
export type { ImageMimeType } from './encode-base64.js'
export * from './entrypoint.js'
export * from './environment.js'
export type { JSONExportConfig, JSONExportEntry } from './export.json.file.js'
export * as filePath from './file.path.array.js'
export type { FilePath, FileType } from './file.path.array.js'
export * as typedPath from './path.typed.js'
export type {
    FilePathType,
    PathTypeResult,
    PathTypeSelectionOptions,
    PathTypeSelector,
    RecognizedFilePathType,
    SelectedFilePathType,
    TypedPath,
} from './path.typed.js'
export {
    FILE_PATH_TYPES,
    getPathOfType,
    getPathType,
    isPathType,
    requirePathOfType,
} from './path.typed.js'
export {
    filePathDoesNotExist,
    filePathExists,
    fsPath,
    fsPathArray,
    fsPathArrayHasFiles,
    fsPathExists,
    fsPathTypeExists,
    fsTypedPath,
} from './zod.node.js'
export type { FsTypedPathOptions, TypedPathSelector } from './zod.node.js'
