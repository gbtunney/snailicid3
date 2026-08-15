import { getGitChangedFiles } from './git.js'
import { getWorkspaceSnapshot } from './packages.js'
import {
    type RepositoryScopeResolution,
    resolveRepositoryScopes,
} from './repository-scopes.js'
import { loadScopePathMatchers } from './scope-matcher-config.js'
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

    const resolved = getWorkspaceScopes({
        keepPrefix: options.keepPrefix ?? false,
        overrides: await loadScopePathMatchers(repoRoot),
        snapshot: getWorkspaceSnapshot(repoRoot),
    })

    return resolveRepositoryScopes(files, resolved.classifiers)
}
