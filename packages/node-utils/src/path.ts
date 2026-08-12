import fs from 'node:fs'
import nodePath from 'node:path'
import { fileURLToPath } from 'node:url'

export type PathRoot = ImportMeta | string

/** Check whether an unknown root resembles ImportMeta with a URL. */
const isImportMeta = (value: unknown): value is ImportMeta =>
    typeof value === 'object' &&
    value !== null &&
    'url' in value &&
    typeof value.url === 'string'

/** Throw when a resolved directory does not exist. */
const assertDirectoryExists = (directoryPath: string): void => {
    if (!fs.existsSync(directoryPath)) {
        throw new Error(`Directory does not exist: ${directoryPath}`)
    }
}

/** Resolve the directory represented by file ImportMeta, falling back to cwd for other protocols. */
const getImportMetaDirname = (meta: ImportMeta): string => {
    const url = new URL(meta.url)

    return url.protocol === 'file:'
        ? nodePath.dirname(fileURLToPath(url))
        : process.cwd()
}

/** Resolve an `ImportMeta` or string root to an absolute directory path. */
export const getDirname = (root: PathRoot, _filePath?: string): string => {
    const directoryPath = isImportMeta(root)
        ? getImportMetaDirname(root)
        : nodePath.resolve(root)

    const resolvedDirectoryPath = nodePath.resolve(directoryPath)
    assertDirectoryExists(resolvedDirectoryPath)

    return resolvedDirectoryPath
}

/** Return a path's basename without its final extension. */
export const getFilename = (fullPath: string): string =>
    nodePath.basename(fullPath, nodePath.extname(fullPath))

/** Return a path's final extension without the leading dot. */
export const getExt = (fullPath: string): string =>
    nodePath.extname(fullPath).replace('.', '')

/** Resolve and normalize a path into an absolute path. */
export const normalizePath = (value: string): string =>
    nodePath.normalize(nodePath.resolve(value))

/** Resolve an optional path root, defaulting to the process working directory. */
export const resolveCwd = (cwd: PathRoot | undefined): string =>
    cwd === undefined ? process.cwd() : getDirname(cwd)

/** Resolve a value against an optional root while preserving absolute inputs. */
export const getFullPath = (
    value: string,
    root: PathRoot | undefined,
): string =>
    nodePath.isAbsolute(value)
        ? normalizePath(value)
        : normalizePath(nodePath.join(resolveCwd(root), value))

/** Check whether a filesystem path exists. */
export const doesFileExist = (filePath: string): boolean =>
    fs.existsSync(filePath)

/** Resolve a file path against a string or ImportMeta root. */
export const getFilePath = (
    rootormeta: PathRoot | undefined,
    filePath: string,
): string => getFullPath(filePath, rootormeta)

export const paths: {
    dirname: typeof getDirname
    exists: typeof doesFileExist
    extension: typeof getExt
    file: typeof getFilePath
    filename: typeof getFilename
    full: typeof getFullPath
    normalize: typeof normalizePath
    resolveCwd: typeof resolveCwd
} = {
    dirname: getDirname,
    exists: doesFileExist,
    extension: getExt,
    file: getFilePath,
    filename: getFilename,
    full: getFullPath,
    normalize: normalizePath,
    resolveCwd,
}
