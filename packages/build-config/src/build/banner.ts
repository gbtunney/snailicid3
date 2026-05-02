/**
 * Banner generation from package.json metadata.
 *
 * Generates a comment block suitable for prepending to bundled output files.
 */

import type { infer as Infer } from 'zod'

import { basePackage } from './schema.js'

export const bannerPackageMetaSchema = basePackage.pick({
    author: true,
    description: true,
    license: true,
    name: true,
    repository: true,
    version: true,
})

export type BannerPackageMeta = Infer<typeof bannerPackageMetaSchema>

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
export function createBanner(meta: BannerPackageMeta): string | undefined
export function createBanner(
    moduleName: string,
    meta: BannerPackageMeta,
): string | undefined
export function createBanner(
    moduleNameOrMeta: BannerPackageMeta | string,
    metaMaybe?: BannerPackageMeta,
): string | undefined {
    const [moduleNameInput, meta] =
        typeof moduleNameOrMeta === 'string'
            ? [moduleNameOrMeta, metaMaybe]
            : [undefined, moduleNameOrMeta]

    const parsedMeta = bannerPackageMetaSchema.safeParse(meta)
    if (!parsedMeta.success) return undefined

    const validMeta = parsedMeta.data
    const moduleName =
        moduleNameInput && moduleNameInput.trim().length > 0
            ? moduleNameInput
            : moduleNameFromPackageName(validMeta.name)

    const lines: Array<string> = [
        ` * ${validMeta.name} v${validMeta.version}`,
        ` * Module: ${moduleName}`,
        ` * (c) ${String(new Date().getFullYear())} ${validMeta.author.name}`,
    ]

    if (validMeta.description) lines.push(` * ${validMeta.description}`)
    if (validMeta.repository) {
        lines.push(
            ` * ${typeof validMeta.repository === 'string' ? validMeta.repository : validMeta.repository.url}`,
        )
    }
    lines.push(` * Released under the ${validMeta.license} License.`)
    lines.push(` * Build: ${new Date().toLocaleString()}`)

    return `/*\n${lines.join('\n')}\n */`
}

function moduleNameFromPackageName(packageName: string): string {
    const nameWithoutScope = packageName.startsWith('@snailicid3/')
        ? packageName.slice('@snailicid3/'.length)
        : packageName.replace(/^@[^/]+\//, '')

    const words = nameWithoutScope
        .split(/[\s._-]+/)
        .filter((word) => word.length > 0)

    return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(' ')
}
