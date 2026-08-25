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
    detectDefaultBranch,
    getCurrentBranch,
    getGitChangedFiles,
    getGitChangedFilesByArea,
    getRepoRoot,
    type GitChangeArea,
    type GitChangedFile,
    type GitChangedFilesOptions,
    resolveBaseBranch,
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
export * from './pull-request-plan.js'
/**
 * The release-plan contract is exported deliberately narrowly.
 *
 * Every name here is one an external adapter needs: the composer, the inputs it accepts, the canonical plan it returns,
 * one package record, and the schema that lets a consumer reject an unsupported `schemaVersion` before reading a field.
 * The intermediate state schemas stay internal on purpose — this slice only observes, and publishing the whole
 * intermediate vocabulary would freeze shapes that later prepare/tag/publish slices still need to move.
 */
export {
    createReleasePlan,
    type CreateReleasePlanInput,
    createReleasePlanInputSchema,
    type ReleasePackagePlan,
    type ReleasePlan,
    releasePlanSchema,
    type ReleaseRegistryObservation,
} from './release-plan.js'
/**
 * Registry observation is exported as one entry point, not as a toolkit.
 *
 * Callers need to observe the workspace and hand the result to `createReleasePlan`; they do not need the resolver,
 * classifier or npm parsing helpers behind it. Keeping those internal leaves the observation strategy free to change
 * without a contract change, which is the whole point of the narrow surface established for the plan itself.
 */
export {
    type NpmCommandRunner,
    observeWorkspaceRegistry,
    type ObserveWorkspaceRegistryOptions,
    type WorkspaceRegistryObservation,
} from './release-registry.js'
export {
    createRepositoryScopeClassifiers,
    getWorkspaceScopeClassifiers,
    type RepositoryScopeClassifiers,
    type RepositoryScopeResolution,
    resolveRepositoryScopes,
} from './repository-scopes.js'
export { loadScopePathMatchers } from './scope-matcher-config.js'
export { formatScopes, type ScopeFormat, shortenScopeName } from './scopes.js'
export * from './workflow-plan.js'
export * from './workspace-scopes.js'
