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
            .filter((workspacePackage) => path.resolve(workspacePackage.path) !== path.resolve(repoRoot))
            .map((workspacePackage) => {
                const relativePackagePath = normalizeRepoPath(repoRoot, workspacePackage.path)
                return [
                    shortenScopeName(workspacePackage.name, keepPrefix),
                    [`${relativePackagePath}/**`],
                ] as const
            }),
    )

/** Merge generated workspace classifiers with custom repository classifiers. */
export const createRepositoryScopeClassifiers = (
    repoRoot: string,
    customClassifiers: RepositoryScopeClassifiers = {},
    keepPrefix: boolean = false,
): RepositoryScopeClassifiers => ({
    ...getWorkspaceScopeClassifiers(repoRoot, keepPrefix),
    ...customClassifiers,
})

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
