import fs from 'node:fs'
import nodePath from 'node:path'
import { fileURLToPath } from 'node:url'

export type PathRoot = ImportMeta | string

const isImportMeta = (value: unknown): value is ImportMeta =>
    typeof value === 'object' &&
    value !== null &&
    'url' in value &&
    typeof value.url === 'string'

const assertDirectoryExists = (directoryPath: string): void => {
    if (!fs.existsSync(directoryPath)) {
        throw new Error(`Directory does not exist: ${directoryPath}`)
    }
}

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

export const getFilename = (fullPath: string): string =>
    nodePath.basename(fullPath, nodePath.extname(fullPath))

export const getExt = (fullPath: string): string =>
    nodePath.extname(fullPath).replace('.', '')

export const normalizePath = (value: string): string =>
    nodePath.normalize(nodePath.resolve(value))

export const resolveCwd = (cwd: PathRoot | undefined): string =>
    cwd === undefined ? process.cwd() : getDirname(cwd)

export const getFullPath = (
    value: string,
    root: PathRoot | undefined,
): string =>
    nodePath.isAbsolute(value)
        ? normalizePath(value)
        : normalizePath(nodePath.join(resolveCwd(root), value))

export const doesFileExist = (filePath: string): boolean =>
    fs.existsSync(filePath)

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
