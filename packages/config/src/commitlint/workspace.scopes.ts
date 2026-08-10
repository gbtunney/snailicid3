import { uniqueSorted } from './../utilities/array.js'
import { getWorkspacePackagesList } from './../workspace/packages.js'
import {
    resolveScopePathMatchers,
    type ScopePathMatcherOverrides,
} from './../workspace/scope-matchers.js'
import {
    formatScopes,
    isRootPackageName,
    shortenScopeName,
} from './../workspace/scopes.js'

export type WorkspaceScopesOptions = {
    format?: 'array' | 'csv'
    includeBaseScopes?: boolean
    keepPrefix?: boolean
    matchers?: ScopePathMatcherOverrides
    mergeScopes?: ReadonlyArray<string>
}

const BASE_COMMITLINT_SCOPES = ['root'] as const

export const workspaceScopes = (
    options: WorkspaceScopesOptions = {},
): Array<string> => {
    const {
        includeBaseScopes = true,
        keepPrefix = false,
        matchers = {},
        mergeScopes = [],
    } = options

    const scopes = new Set<string>()

    if (includeBaseScopes) {
        for (const scope of BASE_COMMITLINT_SCOPES) {
            scopes.add(scope)
        }

        for (const scope of Object.keys(resolveScopePathMatchers(matchers))) {
            scopes.add(scope)
        }
    } else {
        for (const [scope, patterns] of Object.entries(matchers)) {
            if (patterns && patterns.length > 0) scopes.add(scope)
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
