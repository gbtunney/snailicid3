import {
    formatScopes,
    isRootPackageName,
    shortenScopeName,
    uniqueSorted,
} from './../scope/lib.js'
import { getWorkspacePackagesList } from './../workspace/packages.js'

export type WorkspaceScopesOptions = {
    format?: 'array' | 'csv'
    includeBaseScopes?: boolean
    keepPrefix?: boolean
    mergeScopes?: ReadonlyArray<string>
}

const BASE_COMMITLINT_SCOPES = ['root', 'actions', 'notes', 'scripts'] as const

export const workspaceScopes = (
    options: WorkspaceScopesOptions = {},
): Array<string> => {
    const {
        includeBaseScopes = true,
        keepPrefix = false,
        mergeScopes = [],
    } = options

    const scopes = new Set<string>()

    if (includeBaseScopes) {
        for (const scope of BASE_COMMITLINT_SCOPES) {
            scopes.add(scope)
        }
    }

    for (const scope of mergeScopes) {
        scopes.add(scope)
    }

    for (const pkg of getWorkspacePackagesList()) {
        scopes.add(
            isRootPackageName(pkg.name)
                ? 'root'
                : shortenScopeName(pkg.name, keepPrefix),
        )
    }

    return uniqueSorted([...scopes])
}

export const workspaceScopesCsv = (
    options: Omit<WorkspaceScopesOptions, 'format'> = {},
): string => {
    return formatScopes(workspaceScopes(options), 'csv')
}
