/**
 * The deliberate public surface of workspace core.
 *
 * Explicit rather than `export *`: while both scope engines existed, the barrel re-exported them side by side and made
 * the obsolete one look equally canonical. Generic helpers stay internal — `array.js` and `paths.js` are implementation
 * details, not workspace domain API.
 */
export * from './branch-actions.js'
export * from './branch-commit.js'
export * from './branch-state.js'
export {
    getCurrentBranch,
    getGitChangedFiles,
    getGitChangedFilesByArea,
    getRepoRoot,
    type GitChangeArea,
    type GitChangedFile,
    type GitChangedFilesOptions,
} from './git.js'
export * from './hooks.js'
export {
    findNearestPackageJson,
    getWorkspacePackagesList,
    getWorkspaceSnapshot,
    readPackageName,
    safeGetWorkspaceSnapshot,
    type WorkspacePackage,
    workspacePackageManagerOutputSchema,
    workspacePackageRecordSchema,
    type WorkspaceSnapshot,
    type WorkspaceSnapshotResult,
} from './packages.js'
export {
    createRepositoryScopeClassifiers,
    getWorkspaceScopeClassifiers,
    type RepositoryScopeClassifiers,
    type RepositoryScopeResolution,
    resolveRepositoryScopes,
} from './repository-scopes.js'
export { loadScopePathMatchers } from './scope-matcher-config.js'
export { formatScopes, type ScopeFormat, shortenScopeName } from './scopes.js'
export * from './workspace-scopes.js'
