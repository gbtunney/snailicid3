/**
 * Banner generation from package.json metadata.
 *
 * Generates a comment block suitable for prepending to bundled output files.
 */

import type { infer as Infer } from 'zod'

import { basePackage } from './schema.js'
import {moduleNameFromPackageName,toBlockComment} from './helpers.js'
export const bannerPackageMetaSchema = basePackage.pick({
    author: true,
    description: true,
    license: true,
    name: true,
    repository: true,
    version: true,
})

export type BannerPackageMeta = Infer<typeof bannerPackageMetaSchema>

export { toBlockComment } from './helpers.js'

/**
 * Generate a banner comment block from package metadata.
 *
 * Returns `undefined` if `meta` is missing required fields (`name`, `version`).
 *
 * @example
 *     ;```ts
 *     const banner = createBanner('myModule', pkg)
 *     // /*
 *     //  * my-package v1.0.0
 *     //  * Module: myModule
 *     //  * ...
 *     //  * /
 *     ```
 */

export function createBanner(
    packageMeta: BannerPackageMeta,
    moduleName?: string,
): string | undefined {
    const parsedMeta = bannerPackageMetaSchema.safeParse(packageMeta)
    if (!parsedMeta.success) return undefined

    const validMeta = parsedMeta.data
    const resolvedModuleName :string=
        moduleName && moduleName.trim().length > 0
            ? moduleName
            : moduleNameFromPackageName(validMeta.name)

    const lines: Array<string> = [
        `${validMeta.name} v${validMeta.version}`,
        `Module: ${resolvedModuleName}`,
        `(c) ${String(new Date().getFullYear())} ${validMeta.author.name}`,
    ]

    if (validMeta.description) lines.push(validMeta.description)
    if (validMeta.repository) {
        lines.push(
            typeof validMeta.repository === 'string'
                ? validMeta.repository
                : validMeta.repository.url,
        )
    }
    lines.push(`Released under the ${validMeta.license} License.`)
    lines.push(`Build: ${new Date().toLocaleString()}`)

    return toBlockComment(lines)
}
