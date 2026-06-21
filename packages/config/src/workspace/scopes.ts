export type ScopeFormat = 'csv' | 'list'

export function formatScopes(
    scopes: ReadonlyArray<string>,
    format: ScopeFormat,
): string {
    const values = scopes.length > 0 ? scopes : ['root']

    if (format === 'list') return values.join('\n')

    // Keep commas tight so commitlint multi-scope parsing does not include
    // leading spaces in later scope values.
    return values.join(',')
}

export function isRootPackageName(packageName: string): boolean {
    return packageName === 'root' || /^@[^/]+\/root$/.test(packageName)
}

export function shortenScopeName(
    scopeName: string,
    keepPrefix = false,
): string {
    if (keepPrefix) return scopeName

    if (!scopeName.startsWith('@')) return scopeName

    const slashIndex = scopeName.indexOf('/')

    if (slashIndex === -1) return scopeName

    return scopeName.slice(slashIndex + 1)
}
