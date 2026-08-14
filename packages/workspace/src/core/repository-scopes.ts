import { classifyFiles, type StringClassifiers } from '@snailicid3/node-utils'
import path from 'node:path'
import { uniqueSorted } from './array.js'
import { getWorkspacePackagesList } from './packages.js'
import { normalizeRepoPath } from './paths.js'
import { shortenScopeName } from './scopes.js'

export type RepositoryScopeClassifiers = StringClassifiers

export type RepositoryScopeResolution = {
    matches: Readonly<Record<string, Array<string>>>
    scopes: Array<string>
    unmatched: Array<string>
}

/** Generate file classifiers for every workspace package. */
export const getWorkspaceScopeClassifiers = (
    repoRoot: string,
    keepPrefix: boolean = false,
): RepositoryScopeClassifiers =>
    Object.fromEntries(
        getWorkspacePackagesList(undefined, repoRoot)
            .filter(
                (workspacePackage) =>
                    path.resolve(workspacePackage.path) !==
                    path.resolve(repoRoot),
            )
            .map((workspacePackage) => {
                const relativePackagePath = normalizeRepoPath(
                    repoRoot,
                    workspacePackage.path,
                )
                return [
                    shortenScopeName(workspacePackage.name, keepPrefix),
                    [`${relativePackagePath}/**`],
                ] as const
            }),
    )

/**
 * Merge generated workspace classifiers with custom repository classifiers.
 *
 * Patterns are unioned on a key collision rather than replaced. A custom key that matches a shortened package name
 * would otherwise drop that package's own classifier, so the package's files would silently stop matching their own
 * scope — the scope-enum side hides it, because a `Set` dedupes the name away and only the file-to-scope mapping
 * changes.
 */
export const createRepositoryScopeClassifiers = (
    repoRoot: string,
    customClassifiers: RepositoryScopeClassifiers = {},
    keepPrefix: boolean = false,
): RepositoryScopeClassifiers => {
    const merged: Record<string, Array<string>> = Object.fromEntries(
        Object.entries(getWorkspaceScopeClassifiers(repoRoot, keepPrefix)).map(
            ([scope, patterns]) => [scope, [...patterns]],
        ),
    )

    for (const [scope, patterns] of Object.entries(customClassifiers)) {
        const existing = merged[scope]

        merged[scope] =
            existing === undefined
                ? [...patterns]
                : uniqueSorted([...existing, ...patterns])
    }

    return merged
}

/** Classify repository files and return both scope names and the files that produced them. */
export const resolveRepositoryScopes = (
    files: ReadonlyArray<string>,
    classifiers: RepositoryScopeClassifiers,
): RepositoryScopeResolution => {
    const matches = classifyFiles(files, classifiers)
    const matchedFiles = new Set(Object.values(matches).flat())
    const scopes = uniqueSorted(
        Object.entries(matches)
            .filter(([, matched]) => matched.length > 0)
            .map(([scope]) => scope),
    )
    const unmatched = files.filter((file) => !matchedFiles.has(file))

    return {
        matches,
        scopes: scopes.length > 0 ? scopes : ['root'],
        unmatched,
    }
}
