/**
 * Banner generation from package.json metadata.
 *
 * Generates a comment block suitable for prepending to bundled output files.
 */

export type BannerPackageMeta = {
    name: string
    version: string
    description?: string
    license?: string
    author?: string | { name: string; email?: string }
    repository?: string | { url: string }
}

function authorName(author: BannerPackageMeta['author']): string {
    if (!author) return ''
    return typeof author === 'string' ? author : author.name
}

function repoUrl(repository: BannerPackageMeta['repository']): string {
    if (!repository) return ''
    return typeof repository === 'string' ? repository : repository.url
}

/**
 * Generate a banner comment block from package metadata.
 *
 * Returns `undefined` if `meta` is missing required fields (`name`, `version`).
 *
 * @example
 * ```ts
 * const banner = createBanner('myModule', pkg)
 * // /*
 * //  * my-package v1.0.0
 * //  * Module: myModule
 * //  * ...
 * //  * /
 * ```
 */
export function createBanner(moduleName: string, meta: BannerPackageMeta): string | undefined {
    if (!meta.name || !meta.version) return undefined

    const lines: Array<string> = [
        ` * ${meta.name} v${meta.version}`,
        ` * Module: ${moduleName}`,
        ` * (c) ${new Date().getFullYear()} ${authorName(meta.author)}`,
    ]

    if (meta.description) lines.push(` * ${meta.description}`)
    if (meta.repository) lines.push(` * ${repoUrl(meta.repository)}`)
    if (meta.license) lines.push(` * Released under the ${meta.license} License.`)
    lines.push(` * Build: ${new Date().toLocaleString()}`)

    return `/*\n${lines.join('\n')}\n */`
}
