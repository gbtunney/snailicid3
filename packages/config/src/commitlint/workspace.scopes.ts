import {
    formatScopes,
    getWorkspaceScopes,
    getWorkspaceSnapshot,
    type WorkspaceScopeOverrides,
} from '@snailicid3/workspace'

export type WorkspaceScopesOptions = {
    format?: 'array' | 'csv'
    includeBaseScopes?: boolean
    keepPrefix?: boolean
    matchers?: WorkspaceScopeOverrides
    mergeScopes?: ReadonlyArray<string>
}

/**
 * Commitlint's valid scope names.
 *
 * Derived from the same resolved model that produces the file classifiers, so the enum and the classification can no
 * longer disagree. This function used to walk workspace packages itself and enumerate matcher keys separately, which is
 * why the two agreed only by coincidence.
 */
export const workspaceScopes = (
    options: WorkspaceScopesOptions = {},
): Array<string> => {
    const { keepPrefix = false, matchers = {}, mergeScopes = [] } = options

    const resolved = getWorkspaceScopes({
        keepPrefix,
        overrides: {
            ...matchers,
            // Manual scopes: valid to write, nothing classifies into them automatically.
            ...Object.fromEntries(
                mergeScopes.map((scope) => [scope, true] as const),
            ),
        },
        snapshot: getWorkspaceSnapshot(),
    })

    return resolved.names
}

export const workspaceScopesCsv = (
    options: Omit<WorkspaceScopesOptions, 'format'> = {},
): string => {
    return formatScopes(workspaceScopes(options), 'csv')
}
