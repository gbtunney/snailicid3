import fs from 'node:fs'
import path from 'node:path'

import { isGlob, normalizePath } from './file.path.array.js'

export const FILE_PATH_TYPES = [
    'directory',
    'file',
    'glob',
    'symlink',
    'unknown',
] as const

export type FilePathType = (typeof FILE_PATH_TYPES)[number]

declare const PATH_TYPE: unique symbol

export type PathTypeResult = {
    [Type in FilePathType]: {
        path: TypedPath<Type>
        type: Type
    }
}[FilePathType]

export type TypedPath<Type extends FilePathType = FilePathType> = string & {
    readonly [PATH_TYPE]: Type
}

const createPathTypeResult = <Type extends FilePathType>(
    value: string,
    type: Type,
): Extract<PathTypeResult, { type: Type }> => {
    return {
        path: value as TypedPath<Type>,
        type,
    } as unknown as Extract<PathTypeResult, { type: Type }>
}

/**
 * Normalize and classify a filesystem path or glob.
 *
 * Unknown values include undefined, empty strings, missing paths and filesystem entries that are not files, directories
 * or symbolic links.
 */
export const getPathType = (value: string | undefined): PathTypeResult => {
    if (value === undefined || value.trim().length === 0) {
        return createPathTypeResult('', 'unknown')
    }

    if (isGlob(value)) {
        return createPathTypeResult(path.normalize(value), 'glob')
    }

    const normalizedPath = normalizePath(value)

    if (!fs.existsSync(normalizedPath)) {
        return createPathTypeResult(normalizedPath, 'unknown')
    }

    const stats = fs.lstatSync(normalizedPath)

    if (stats.isSymbolicLink()) {
        return createPathTypeResult(normalizedPath, 'symlink')
    }

    if (stats.isDirectory()) {
        return createPathTypeResult(normalizedPath, 'directory')
    }

    if (stats.isFile()) {
        return createPathTypeResult(normalizedPath, 'file')
    }

    return createPathTypeResult(normalizedPath, 'unknown')
}

/** Narrow a classified path result to one requested path type. */
export const isPathType = <Type extends FilePathType>(
    result: PathTypeResult,
    requiredType: Type,
): result is Extract<PathTypeResult, { type: Type }> => {
    return result.type === requiredType
}

/** Return a branded path only when its detected type matches the requested type. */
export const getPathOfType = <Type extends FilePathType>(
    value: string | undefined,
    requiredType: Type,
): TypedPath<Type> | undefined => {
    const result = getPathType(value)

    if (!isPathType(result, requiredType)) {
        return undefined
    }

    return result.path as TypedPath<Type>
}

/** Return a branded path of the requested type or throw a TypeError. */
export const requirePathOfType = <Type extends FilePathType>(
    value: string | undefined,
    requiredType: Type,
): TypedPath<Type> => {
    const result = getPathType(value)

    if (!isPathType(result, requiredType)) {
        throw new TypeError(
            `Expected path type "${requiredType}", received "${result.type}"`,
        )
    }

    return result.path as TypedPath<Type>
}
