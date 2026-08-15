import { getGitChangedFiles } from './git.js'
import { getWorkspaceSnapshot } from './packages.js'
import {
    type RepositoryScopeResolution,
    resolveRepositoryScopes,
} from './repository-scopes.js'
import { loadScopePathMatchers } from './scope-matcher-config.js'
import { getWorkspaceScopes } from './workspace-scopes.js'

/**
 * Commit-scope resolution shared by every commit path.
 *
 * `scope-commit` resolved scopes through a private helper, so a second commit entry point had to either duplicate the
 * snapshot/override/classifier wiring or drift from it. The scope a commit records is part of the workflow contract —
 * branch identity supplies the type and slug, this supplies the scope — so it lives in core where both CLIs consume the
 * same implementation.
 */

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
 * Resolve repository scopes for an explicit file list.
 *
 * An empty list resolves to `root` rather than an empty scope: a commit message always needs a scope, and `root` is the
 * documented value for changes that match no package.
 */
export const resolveScopesForFiles = async (
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

/**
 * Resolve the scope of the currently staged files.
 *
 * Each commit resolves its own scope: the workflow branch carries type and slug for the life of the branch, while the
 * scope belongs to the individual commit and is recalculated from what that commit stages.
 */
export const resolveStagedScopes = async (
    repoRoot: string,
    options: CommitScopeOptions = {},
): Promise<RepositoryScopeResolution> =>
    resolveScopesForFiles(repoRoot, getStagedFiles(repoRoot), options)
