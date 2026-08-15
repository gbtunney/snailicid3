/**
 * Banner generation from package.json metadata.
 *
 * Generates a comment block suitable for prepending to bundled output files.
 */

import type z from 'zod'

import { packageNameToDisplayName, toBlockComment } from './helpers.js'
import {
    type BannerPackageMeta,
    schemaPackageMetaBanner,
} from './schemas/package.js'

export { toBlockComment } from './helpers.js'

/**
 * Generate a banner comment block from package metadata.
 *
 * Returns `undefined` if `meta` is missing required fields (`name`, `version`).
 *
 * @example
 *     ;```ts
 *     const banner = createBanner('myModule', pkg)
 *     /*
 *      my-package v1.0.0
 *     Module:  myModule
 *      ...
 *      /
 *     ```
 */

export function createBanner(
    packageMeta: z.input<typeof schemaPackageMetaBanner>,
    moduleName?: string,
): string | undefined {
    const parsedMeta = schemaPackageMetaBanner.safeParse(packageMeta)
    if (!parsedMeta.success) return undefined

    const validMeta: BannerPackageMeta = parsedMeta.data
    const resolvedModuleName: string =
        moduleName && moduleName.trim().length > 0
            ? moduleName
            : packageNameToDisplayName(validMeta.name)

    const lines: Array<string> = [
        `${validMeta.name} v${validMeta.version}`,
        `Module: ${resolvedModuleName}`,
    ]

    // Author, repository and license are optional in a valid manifest, and each may be written in more
    // than one shape. An absent field is omitted rather than rendered as "undefined".
    const authorName = resolveAuthorName(validMeta.author)
    if (authorName) {
        lines.push(`(c) ${String(new Date().getFullYear())} ${authorName}`)
    }

    if (validMeta.description) lines.push(validMeta.description)

    const repositoryUrl = resolveRepositoryUrl(validMeta.repository)
    if (repositoryUrl) lines.push(repositoryUrl)

    if (validMeta.license) {
        lines.push(`Released under the ${validMeta.license} License.`)
    }

    lines.push(`Build: ${new Date().toLocaleString()}`)

    return toBlockComment(lines)
}

function resolveAuthorName(author: BannerPackageMeta['author']): string {
    if (author === undefined) return ''
    return typeof author === 'string' ? author : (author.name ?? '')
}

function resolveRepositoryUrl(
    repository: BannerPackageMeta['repository'],
): string {
    if (repository === undefined) return ''
    return typeof repository === 'string' ? repository : (repository.url ?? '')
}
export {
    type BannerPackageMeta,
    schemaPackageMetaBanner,
} from './schemas/package.js'
