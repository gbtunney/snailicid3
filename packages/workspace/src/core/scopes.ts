import type { WorkspaceSnapshot } from './packages.js'

export type ScopeFormat = 'csv' | 'list'

/** Format scope names for a comma-delimited CLI value or a newline-delimited list. */
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

/**
 * Map a workspace package/project name to a commit scope.
 *
 * Root is decided by the package's normalized path, not by its name: a nested package may legitimately be called
 * `@scope/root`. Callers that only have a bare name — Nx project names, or a changeset's frontmatter — resolve it back
 * to a package record through the snapshot first.
 */
export function resolveProjectScopeName(
    projectName: string,
    keepPrefix: boolean,
    snapshot: WorkspaceSnapshot,
): string {
    if (projectName === '.') return 'root'

    const workspacePackage = snapshot.lookup.get(projectName)

    if (workspacePackage?.path === '.') return 'root'

    return shortenScopeName(projectName, keepPrefix)
}

/** Remove an npm organization prefix from a scope unless the prefix should be retained. */
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
