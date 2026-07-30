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
import {
    getPathType,
    isPathType,
    type PathTypeSelectionOptions,
    type PathTypeSelector,
    type SelectedFilePathType,
    type TypedPath,
} from './path.typed.js'

export type FsTypedPathOptions<Negate extends boolean = boolean> =
    PathTypeSelectionOptions<Negate> & {
        /** Require the path to exist. Globs must match at least one entry. */
        exists?: boolean
    }
export type TypedPathSelector = PathTypeSelector

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
export const fsTypedPath = <
    Selector extends TypedPathSelector,
    Negate extends boolean = false,
>(
    allowedTypes: Selector,
    rootOrOptions?: FsTypedPathOptions<Negate> | string,
    options?: FsTypedPathOptions<Negate>,
): z.ZodType<TypedPath<SelectedFilePathType<Selector, Negate>>, string> => {
    const root = typeof rootOrOptions === 'string' ? rootOrOptions : undefined
    const resolvedOptions =
        typeof rootOrOptions === 'string' ? options : rootOrOptions
    const requireExists = resolvedOptions?.exists ?? false
    const negate = resolvedOptions?.negate ?? false

    return z
        .string()
        .transform((value) => getFullPath(value, root))
        .transform((value, context) => {
            const result = getPathType(value)
            const expected = negate
                ? `any recognized path type except ${typeof allowedTypes === 'string' ? allowedTypes : allowedTypes.join(' | ')}`
                : allowedTypes === 'any'
                  ? 'a file, directory, symlink, or glob'
                  : typeof allowedTypes === 'string'
                    ? `path type "${allowedTypes}"`
                    : `one of these path types: ${allowedTypes.join(' | ')}`
            const accepted = isPathType(result, allowedTypes, {
                negate,
            })

            if (!accepted) {
                const exists = doesFileExist(result.path)
                const message =
                    result.type === 'unknown'
                        ? exists
                            ? `Path is not a supported filesystem entry: "${result.path}" (expected ${expected})`
                            : `Path does not exist: "${result.path}" (expected ${expected})`
                        : `Expected ${expected}, but "${result.path}" is path type "${result.type}"`

                context.addIssue({
                    code: 'custom',
                    message,
                })
                return z.NEVER
            }

            if (requireExists && getExistingPathType(value) === undefined) {
                const message =
                    result.type === 'glob'
                        ? `Glob pattern did not match any filesystem entries: "${result.path}"`
                        : `Path does not exist: "${result.path}"`
                context.addIssue({
                    code: 'custom',
                    message,
                })
                return z.NEVER
            }

            return result.path as TypedPath<
                SelectedFilePathType<Selector, Negate>
            >
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
