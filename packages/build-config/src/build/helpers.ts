import { arrayIncludes } from 'ts-extras'
import fs from 'node:fs'
import path from 'node:path'
import { ENTRY_KEY_DEFAULTS, SLUG_LIKE_REGEX } from './schemas/index.js'

/**
 * Tests whether a string is a lowercase slug-like identifier.
 *
 * Allows:
 *
 * - Lowercase letters
 * - Numbers
 * - Separators: `-`, `_`, `.`
 *
 * Disallows:
 *
 * - Spaces
 * - Uppercase letters
 * - Repeated separators
 * - Leading/trailing separators
 *
 * @example
 *     isSlugLike('foo') // true
 *     isSlugLike('foo-bar') // true
 *     isSlugLike('foo_bar') // true
 *     isSlugLike('foo.bar') // true
 *     isSlugLike('foo-bar_baz.test') // true
 *
 * @example
 *     isSlugLike('FooBar') // false
 *     isSlugLike('foo bar') // false
 *     isSlugLike('foo--bar') // false
 *     isSlugLike('-start') // false
 *     isSlugLike('end-') // false
 */
export function isSlugLike(value: string): boolean {
    return SLUG_LIKE_REGEX.test(value)
}

/**
 * Removes the npm scope from a package name, if present.
 *
 * @example
 *     packageNameWithoutScope('@snailicid3/color-tools')
 *     // 'color-tools'
 *
 * @example
 *     packageNameWithoutScope('@types/node')
 *     // 'node'
 *
 * @example
 *     packageNameWithoutScope('react')
 *     // 'react'
 */
export function packageNameWithoutScope(packageName: string): string {
    return packageName.replace(/^@[^/]+\//, '')
}

/**
 * Converts a slug-like string into a human-readable display name.
 *
 * Supports separators:
 *
 * - `-`
 * - `_`
 * - `.`
 *
 * @example
 *     slugLikeToDisplayName('foo-bar')
 *     // 'Foo Bar'
 *
 * @example
 *     slugLikeToDisplayName('foo_bar')
 *     // 'Foo Bar'
 *
 * @example
 *     slugLikeToDisplayName('foo.bar')
 *     // 'Foo Bar'
 *
 * @example
 *     slugLikeToDisplayName('foo-bar_baz.test')
 *     // 'Foo Bar Baz Test'
 *
 * @example
 *     slugLikeToDisplayName('react')
 *     // 'React'
 *
 * @throws {TypeError} Throws if the value is not slug-like.
 */
export function slugLikeToDisplayName(value: string): string {
    if (!isSlugLike(value)) {
        throw new TypeError(`Expected a slug-like string, received: "${value}"`)
    }

    return value
        .split(/[._-]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

/**
 * Converts a slug-like string into PascalCase.
 *
 * Supports separators:
 *
 * - `-`
 * - `_`
 * - `.`
 * - Whitespace
 *
 * @example
 *     slugLikeToPascalCase('foo-bar')
 *     // 'FooBar'
 *
 * @example
 *     slugLikeToPascalCase('foo_bar')
 *     // 'FooBar'
 *
 * @example
 *     slugLikeToPascalCase('foo.bar')
 *     // 'FooBar'
 *
 * @example
 *     slugLikeToPascalCase('foo-bar_baz.test')
 *     // 'FooBarBazTest'
 *
 * @example
 *     slugLikeToPascalCase('react')
 *     // 'React'
 *
 * @throws {TypeError} Throws if the value is not slug-like.
 */
export function slugLikeToPascalCase(value: string): string {
    if (!isSlugLike(value)) {
        throw new TypeError(`Expected a slug-like string, received: "${value}"`)
    }
    return value
        .split(/[\s._-]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join('')
}

const ROOT_EXPORT_KEYS = ENTRY_KEY_DEFAULTS

export function escapeRegex(value: string): string {
    return value.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&')
}

/**
 * Creates a regular expression that matches any of the provided file extensions at the end of a string.
 *
 * Extensions are automatically escaped for safe regex usage.
 *
 * @example
 *     const pattern = fileExtensionsToPattern(['.ts', '.tsx', '.mts'])
 *
 *     pattern.test('index.ts')
 *     // true
 *
 *     pattern.test('src/utils.tsx')
 *     // true
 *
 *     pattern.test('foo.ts.backup')
 *     // false
 *
 *     pattern.test('typescript')
 *     // false
 *
 * @example
 *     const pattern = fileExtensionsToPattern(['.test.ts'])
 *
 *     pattern.test('example.test.ts')
 *     // true
 */
export function fileExtensionsToPattern(
    extensions: ReadonlyArray<string>,
): RegExp {
    return new RegExp(
        `(?:${extensions
            .map(normalizeFileExtension)
            .map(escapeRegex)
            .join('|')})$`,
    )
}

/**
 * Converts a filename stem back to an npm export key.
 *
 * @example
 *     filenameToExportKey('index') // '.'
 *     filenameToExportKey('utils') // './utils'
 */
export function filenameToExportKey(filename: string): string {
    return filename === 'index' ? '.' : normaliseExportKey(filename)
}

/**
 * Normalises an entry key to an npm export key.
 *
 * @example
 *     normaliseExportKey('.') // '.'
 *     normaliseExportKey('*') // '.'
 *     normaliseExportKey('main') // '.'
 *     normaliseExportKey('utils') // './utils'
 *     normaliseExportKey('./utils') // './utils'
 */
export function normaliseExportKey(key: string): string {
    return arrayIncludes(ROOT_EXPORT_KEYS, key)
        ? '.'
        : key.startsWith('./')
          ? key
          : `./${key}`
}

/** Removes the leading dot */
export function normalizeFileExtension(extension: string): string {
    return extension.startsWith('.') ? extension : `.${extension}`
}
/**
 * Resolves the output filename stem for an entry key.
 *
 * @example
 *     resolveEntryFilename('.') // 'index'
 *     resolveEntryFilename('*') // 'index'
 *     resolveEntryFilename('main') // 'index'
 *     resolveEntryFilename('./utils') // 'utils'
 *     resolveEntryFilename('utils') // 'utils'
 */
export function resolveEntryFilename(key: string): string {
    return arrayIncludes(ROOT_EXPORT_KEYS, key)
        ? 'index'
        : key.replace(/^\.\//, '')
}

export function resolveSourceEntryPath(options: {
    key: string
    sourceDir: string
    sourceFile?: string
}): string {
    const { key, sourceDir, sourceFile } = options

    const resolvedPath = sourceFile
        ? path.resolve(sourceDir, sourceFile)
        : path.resolve(sourceDir, `${resolveEntryFilename(key)}.ts`)

    if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Source entry file does not exist: ${resolvedPath}`)
    }

    return resolvedPath
}

export function toBlockComment(lines: ReadonlyArray<string>): string {
    return `/*\n${lines.map((line) => ` * ${line}`).join('\n')}\n */`
}


export function entryKeyToSlug(key: string): string {
    return isRootEntryKey(key) ? 'index' : key.replace(/^\.\//, '')
}

export function isRootEntryKey(key: string): boolean {
    return key === '*' || key === '.' || key === './' || key === 'index'
}

export function packageNameToDisplayName(packageName: string): string {
    return slugLikeToDisplayName(packageNameWithoutScope(packageName))
}

export function packageNameToModuleName(packageName: string): string {
    return slugLikeToPascalCase(packageNameWithoutScope(packageName))
}
