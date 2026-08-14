import { classifyFiles, type StringClassifiers } from '@snailicid3/node-utils'
import { uniqueSorted } from './array.js'
import { getWorkspaceSnapshot, type WorkspaceSnapshot } from './packages.js'
import { shortenScopeName } from './scopes.js'

export type RepositoryScopeClassifiers = StringClassifiers

export type RepositoryScopeResolution = {
    matches: Readonly<Record<string, Array<string>>>
    scopes: Array<string>
    unmatched: Array<string>
}

/**
 * Generate file classifiers for every workspace package.
 *
 * Takes an already-parsed snapshot: classifier construction is a pure mapping and must not trigger package discovery,
 * which would re-run the package manager on every call.
 *
 * The root package is identified by its normalized path `'.'`, not by its name. Matching on the name `root` is wrong —
 * a nested package may legitimately be called `@scope/root` — and resolving the path is wrong too, because a relative
 * path resolves against the process directory rather than the repository. Root is excluded because a `./**` classifier
 * would match every file.
 *
 * Two packages that shorten to the same scope have their patterns unioned rather than one silently overwriting the
 * other.
 */
export const getWorkspaceScopeClassifiers = (
    snapshot: WorkspaceSnapshot,
    keepPrefix: boolean = false,
): RepositoryScopeClassifiers => {
    const classifiers = new Map<string, Array<string>>()

    for (const workspacePackage of snapshot.list) {
        if (workspacePackage.path === '.') continue

        const scope = shortenScopeName(workspacePackage.name, keepPrefix)
        const pattern = `${workspacePackage.path}/**`
        const existing = classifiers.get(scope)

        classifiers.set(
            scope,
            existing ? uniqueSorted([...existing, pattern]) : [pattern],
        )
    }

    return Object.fromEntries(classifiers)
}

/** Resolve a snapshot from a repository root when a caller has not already parsed one. */
export const getRepositoryScopeSnapshot = (
    repoRoot: string,
): WorkspaceSnapshot => getWorkspaceSnapshot(repoRoot)

/**
 * Merge generated workspace classifiers with custom repository classifiers.
 *
 * Patterns are unioned on a key collision rather than replaced. A custom key that matches a shortened package name
 * would otherwise drop that package's own classifier, so the package's files would silently stop matching their own
 * scope — the scope-enum side hides it, because a `Set` dedupes the name away and only the file-to-scope mapping
 * changes.
 */
export const createRepositoryScopeClassifiers = (
    snapshot: WorkspaceSnapshot,
    customClassifiers: RepositoryScopeClassifiers = {},
    keepPrefix: boolean = false,
): RepositoryScopeClassifiers => {
    const merged = new Map<string, Array<string>>(
        Object.entries(getWorkspaceScopeClassifiers(snapshot, keepPrefix)).map(
            ([scope, patterns]) => [scope, [...patterns]],
        ),
    )

    for (const [scope, patterns] of Object.entries(customClassifiers)) {
        const existing = merged.get(scope)

        merged.set(
            scope,
            existing ? uniqueSorted([...existing, ...patterns]) : [...patterns],
        )
    }

    return Object.fromEntries(merged)
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
