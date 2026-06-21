import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

///todo is there a better way of naming this?
/** Like the __dir */
export const getDirname = (meta: ImportMeta, filePath: string): string => {
    const directoryPath = path.dirname(fileURLToPath(meta.url))

    if (!fs.existsSync(path.resolve(directoryPath))) {
        throw new Error(
            `Directory does not exist: ${path.resolve(directoryPath)}`,
        )
    }

    return path.resolve(directoryPath)
}

export const getFilename = (fullPath: string): string =>
    path.basename(fullPath, path.extname(fullPath))
export const getExt = (fullPath: string): string =>
    path.extname(fullPath).replace('.', '')

export const getFullPath = (
    _value: string,
    _root: string | undefined,
): string => {
    return _root !== undefined ? `${_root}/${_value}` : _value
}

export const normalizePath = (value: string): string =>
    path.normalize(path.resolve(value))

export const doesFileExist = (path: string): boolean => fs.existsSync(path)

export const getFilePath = (
    rootormeta: ImportMeta | string | undefined,
    filePath: string,
): string => {
    if (rootormeta === undefined) {
        return normalizePath(filePath)
    }
    const dirname =
        typeof rootormeta === 'string'
            ? path.resolve(rootormeta)
            : getDirname(rootormeta, filePath)

    if (!fs.existsSync(path.resolve(dirname))) {
        throw new Error(`Directory does not exist: ${path.resolve(dirname)}`)
    }

    return normalizePath(`${dirname}/${filePath}`)
}
