/* eslint  @typescript-eslint/explicit-function-return-type: "warn" */
import { isString } from 'ramda-adjunct'
import { z } from 'zod'

import {
    doesFileExist,
    type FilePath,
    type FileType,
    getExistingPathType,
    getFilePathArr,
    getFullPath,
    normalizePath,
} from './file.path.array.js'
import { type FilePathType, getPathType, type TypedPath } from './path.typed.js'

export type FsTypedPathOptions = {
    /** Require the path to exist. Globs must match at least one entry. */
    exists?: boolean
}

export type SelectedFilePathType<Selector extends TypedPathSelector> =
    Selector extends 'any'
        ? Exclude<FilePathType, 'unknown'>
        : Selector extends ReadonlyArray<infer Type extends FilePathType>
          ? Type
          : Extract<Selector, FilePathType>

export type TypedPathSelector =
    'any' | FilePathType | ReadonlyArray<FilePathType>

/* * CUSTOM ZOD UTILITIES!! * */
/** @group Zod Schemas */
export const fsPath = (root?: string): z.ZodType<string, string> => {
    return z
        .string()
        .transform((value) => getFullPath(value, root))
        .transform(normalizePath)
}
/** @group Zod Schemas */
export const fsPathArray = (
    root?: string,
    getDirectoryFileContents = false,
): z.ZodType<Array<FilePath>, string> => {
    return fsPath(root).transform((value) =>
        getFilePathArr(value, getDirectoryFileContents),
    )
}
/** @group Zod Schemas */
export const fsPathExists = (
    exists = true,
    root?: string,
    allowedType:
        | 'any'
        | (
              Array<Exclude<FileType, undefined>> | Exclude<FileType, undefined>
          ) = 'any',
): ReturnType<typeof fsPathTypeExists> => {
    if (!exists) {
        return fsPathTypeExists('none', root)
    }
    return fsPathTypeExists(allowedType, root)
}
/** @group Zod Schemas */
export const fsPathTypeExists = (
    allowedType:
        | 'any'
        | 'none'
        | (
              Array<Exclude<FileType, undefined>> | Exclude<FileType, undefined>
          ) = 'any',
    root?: string,
): z.ZodType<string, string> => {
    const allowedLabel = Array.isArray(allowedType)
        ? allowedType.join(' | ')
        : allowedType

    return fsPath(root).refine(
        (value) => {
            let _inner_result = false
            const pathType: FileType = getExistingPathType(value)
            if (allowedType === 'any') {
                if (pathType === 'glob') _inner_result = true
                else if (doesFileExist(value)) _inner_result = true
            } else if (allowedType === 'none') return pathType === undefined
            else {
                const ALLOWED: Array<FileType> = isString(allowedType)
                    ? [allowedType]
                    : allowedType
                ALLOWED.forEach((item) => {
                    if (pathType === item) _inner_result = true
                })
            }
            return _inner_result
        },
        {
            message: `File path does not meet existence/type requirements (allowed: ${allowedLabel})`,
        },
    )
}

/**
 * Normalize, validate and brand a path as one or more filesystem types.
 *
 * The `any` selector accepts any recognized type and rejects `unknown`.
 *
 * @group Zod Schemas
 */
export const fsTypedPath = <Selector extends TypedPathSelector>(
    allowedTypes: Selector,
    rootOrOptions?: FsTypedPathOptions | string,
    options?: FsTypedPathOptions,
): z.ZodType<TypedPath<SelectedFilePathType<Selector>>, string> => {
    const root = typeof rootOrOptions === 'string' ? rootOrOptions : undefined
    const requireExists =
        (typeof rootOrOptions === 'string' ? options : rootOrOptions)?.exists ??
        false

    return z
        .string()
        .transform((value) => getFullPath(value, root))
        .transform((value, context) => {
            const result = getPathType(value)
            const accepted =
                allowedTypes === 'any'
                    ? result.type !== 'unknown'
                    : typeof allowedTypes === 'string'
                      ? result.type === allowedTypes
                      : allowedTypes.includes(result.type)

            if (!accepted) {
                const expected =
                    typeof allowedTypes === 'string'
                        ? allowedTypes
                        : allowedTypes.join(' | ')

                context.addIssue({
                    code: 'custom',
                    message: `Expected path type "${expected}", received "${result.type}"`,
                })
                return z.NEVER
            }

            if (requireExists && getExistingPathType(value) === undefined) {
                context.addIssue({
                    code: 'custom',
                    message: 'Expected path to exist',
                })
                return z.NEVER
            }

            return result.path as TypedPath<SelectedFilePathType<Selector>>
        })
}

/**
 * Schema validates if it is a glob, and if it exists..
 *
 * @group Zod Schemas
 */
export const fsPathArrayHasFiles = (
    getDirectoryFileContents = false,
    root?: string,
): z.ZodType<Array<FilePath>, string> => {
    return fsPathArray(root, getDirectoryFileContents).refine(
        (val: Array<FilePath>) => {
            if (val.length > 0) {
                const _possibleDir: FilePath = val[0]
                if (
                    !getDirectoryFileContents &&
                    _possibleDir.extname.length <= 0
                )
                    return false
            }
            return val.length > 0
        },
        {
            message: `File path array does not contain files`,
        },
    )
}

/** @group Zod Schemas */
export const filePathExists = (): ReturnType<typeof fsPathExists> =>
    fsPathExists(true)
/** @group Zod Schemas */
export const filePathDoesNotExist = (): ReturnType<typeof fsPathExists> =>
    fsPathExists(false)
/** @group Zod Schemas */
export const filePath = (): ReturnType<typeof fsPath> => fsPath()
