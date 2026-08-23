import { uniqueSorted } from './array.js'
import {
    isChangesetContentFile,
    readChangesetPackageNames,
} from './changeset-files.js'
import { getGitChangedFiles } from './git.js'
import { getWorkspaceSnapshot, type WorkspaceSnapshot } from './packages.js'
import {
    type RepositoryScopeResolution,
    resolveRepositoryScopes,
} from './repository-scopes.js'
import { loadScopePathMatchers } from './scope-matcher-config.js'
import { resolveProjectScopeName } from './scopes.js'
import { getWorkspaceScopes } from './workspace-scopes.js'

/** Commit-scope resolution shared by every commit path. */

export type CommitScopeOptions = {
    /** Keep the full package name instead of shortening it to a scope. */
    keepPrefix?: boolean
}

/** Files staged for the next commit — the only files a commit will actually record. */
export const getStagedFiles = (repoRoot: string): Array<string> =>
    getGitChangedFiles({
        cwd: repoRoot,
        includeStaged: true,
        includeUnstaged: false,
        includeUntracked: false,
    })

/**
 * Recover scope for staged changeset files.
 *
 * A changeset's own path never lives inside the package it describes, so path-based classification always leaves it
 * unmatched and the commit falls back to `root`. Its frontmatter names the packages it releases, so those become its
 * scope instead — this is the initial-changeset-commit fix from issue #201.
 */
export const applyChangesetFileScopes = (
    repoRoot: string,
    resolution: RepositoryScopeResolution,
    snapshot: WorkspaceSnapshot,
    keepPrefix: boolean,
): RepositoryScopeResolution => {
    const changesetFiles = resolution.unmatched.filter(isChangesetContentFile)

    if (changesetFiles.length === 0) return resolution

    const matches: Record<string, Array<string>> = Object.fromEntries(
        Object.entries(resolution.matches).map(([scope, matched]) => [
            scope,
            [...matched],
        ]),
    )

    for (const file of changesetFiles) {
        const scopes = uniqueSorted(
            readChangesetPackageNames(repoRoot, file).map((name) =>
                resolveProjectScopeName(name, keepPrefix, snapshot),
            ),
        )

        for (const scope of scopes.length > 0 ? scopes : ['root']) {
            matches[scope] = [...(matches[scope] ?? []), file]
        }
    }

    const changesetFileSet = new Set(changesetFiles)

    return {
        matches,
        scopes: uniqueSorted(
            Object.keys(matches).filter(
                (scope) => (matches[scope]?.length ?? 0) > 0,
            ),
        ),
        unmatched: resolution.unmatched.filter(
            (file) => !changesetFileSet.has(file),
        ),
    }
}

/**
 * Resolve the scopes for the files a commit will record.
 *
 * This is the single composition boundary for commit scope resolution. Callers choose the files; this function loads
 * workspace metadata and matcher overrides, then delegates matching to the repository-scope engine. An empty list
 * resolves to `root` because every commit message requires a scope.
 */
export const resolveCommitScopes = async (
    repoRoot: string,
    files: ReadonlyArray<string>,
    options: CommitScopeOptions = {},
): Promise<RepositoryScopeResolution> => {
    if (files.length === 0) {
        return { matches: {}, scopes: ['root'], unmatched: [] }
    }

    const keepPrefix = options.keepPrefix ?? false
    const snapshot = getWorkspaceSnapshot(repoRoot)
    const resolved = getWorkspaceScopes({
        keepPrefix,
        overrides: await loadScopePathMatchers(repoRoot),
        snapshot,
    })

    const resolution = resolveRepositoryScopes(files, resolved.classifiers)

    return applyChangesetFileScopes(repoRoot, resolution, snapshot, keepPrefix)
}
