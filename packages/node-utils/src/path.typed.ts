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
export type PathTypeSelectionOptions<Negate extends boolean = boolean> = {
    /** Select every recognized path type except the requested types. */
    negate?: Negate
}
export type PathTypeSelector =
    'any' | ReadonlyArray<RecognizedFilePathType> | RecognizedFilePathType

export type RecognizedFilePathType = Exclude<FilePathType, 'unknown'>

export type SelectedFilePathType<
    Selector extends PathTypeSelector,
    Negate extends boolean = false,
> = Negate extends true
    ? Exclude<RecognizedFilePathType, SelectorFilePathType<Selector>>
    : SelectorFilePathType<Selector>

type SelectorFilePathType<Selector extends PathTypeSelector> =
    Selector extends 'any'
        ? RecognizedFilePathType
        : Selector extends ReadonlyArray<
                infer Type extends RecognizedFilePathType
            >
          ? Type
          : Extract<Selector, RecognizedFilePathType>

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

/** Narrow a classified result using one type, multiple types, `any`, or a negated selection. */
export const isPathType = <
    Selector extends PathTypeSelector,
    Negate extends boolean = false,
>(
    result: PathTypeResult,
    selector: Selector,
    options?: PathTypeSelectionOptions<Negate>,
): result is Extract<
    PathTypeResult,
    { type: SelectedFilePathType<Selector, Negate> }
> => {
    const selected =
        selector === 'any'
            ? result.type !== 'unknown'
            : typeof selector === 'string'
              ? result.type === selector
              : result.type !== 'unknown' && selector.includes(result.type)

    return options?.negate === true
        ? result.type !== 'unknown' && !selected
        : selected
}

/** Return a branded path only when its detected type matches the selector. */
export const getPathOfType = <
    Selector extends PathTypeSelector,
    Negate extends boolean = false,
>(
    value: string | undefined,
    selector: Selector,
    options?: PathTypeSelectionOptions<Negate>,
): TypedPath<SelectedFilePathType<Selector, Negate>> | undefined => {
    const result = getPathType(value)

    if (!isPathType(result, selector, options)) {
        return undefined
    }

    return result.path as TypedPath<SelectedFilePathType<Selector, Negate>>
}

/** Return a branded path matching the selector or throw a TypeError. */
export const requirePathOfType = <
    Selector extends PathTypeSelector,
    Negate extends boolean = false,
>(
    value: string | undefined,
    selector: Selector,
    options?: PathTypeSelectionOptions<Negate>,
): TypedPath<SelectedFilePathType<Selector, Negate>> => {
    const result = getPathType(value)

    if (!isPathType(result, selector, options)) {
        const expected =
            selector === 'any'
                ? 'any recognized path type'
                : typeof selector === 'string'
                  ? `path type "${selector}"`
                  : `one of these path types: ${selector.join(' | ')}`
        const selection =
            options?.negate === true ? `anything except ${expected}` : expected
        throw new TypeError(
            `Expected ${selection}, received path type "${result.type}"`,
        )
    }

    return result.path as TypedPath<SelectedFilePathType<Selector, Negate>>
}
