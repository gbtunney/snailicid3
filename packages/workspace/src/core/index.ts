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
 * One entry point, not a Changesets toolkit.
 *
 * Callers need pending release intent joined onto the plan's axes. The adapters behind it — building the package shape
 * Changesets expects, restoring the file context its reader drops, translating a comprehensive release onto intent and
 * version state — are implementation, and exporting them would invite a second release calculator to grow beside
 * Changesets' own.
 */
export {
    observeWorkspaceChangesetIntent,
    type ObserveWorkspaceChangesetIntentOptions,
    type ReleaseIntent,
    type ReleaseVersionState,
    type WorkspaceChangesetIntent,
} from './release-changesets.js'
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
 * Prepare and tag are their own contracts, exported the same way the observation is.
 *
 * Each publishes its composer, its schema so an adapter can reject an unsupported `schemaVersion`, its document type
 * and the per-package outcome a caller iterates. The blocker and summary shapes derive from those documents rather than
 * from their own schemas, so they can be named without publishing the schemas behind them. Nothing intermediate leaves
 * the package: no selection resolvers, no blocker derivation, no adapters.
 */
export {
    createReleasePreparePlan,
    type CreateReleasePreparePlanInput,
    createReleasePreparePlanInputSchema,
    type ReleasePreparationEvidence,
    releasePreparationEvidenceSchema,
    type ReleasePrepareBlocker,
    type ReleasePreparePackage,
    type ReleasePreparePlan,
    releasePreparePlanSchema,
    type ReleasePreparePlanSummary,
} from './release-prepare.js'
/**
 * Registry observation is exported as one entry point, not as a toolkit.
 *
 * Callers need to observe the workspace and hand the result to `createReleasePlan`; they do not need the resolver,
 * classifier or npm parsing helpers behind it. Keeping those internal leaves the observation strategy free to change
 * without a contract change, which is the whole point of the narrow surface established for the plan itself.
 */
export {
    observeWorkspaceRegistry,
    type ObserveWorkspaceRegistryOptions,
    type WorkspaceRegistryObservation,
} from './release-registry.js'
/**
 * Two renderers, no presentation model.
 *
 * Callers need a plan drawn for a terminal or a pull-request comment. The presentation model both renderers share stays
 * internal until something outside the package genuinely needs to build a third projection — exporting it now would
 * freeze a shape whose only job so far is to keep these two in step.
 */
export {
    renderReleasePlanMarkdown,
    renderReleasePlanTerminal,
} from './release-render.js'
export {
    createReleaseTagPlan,
    type CreateReleaseTagPlanInput,
    createReleaseTagPlanInputSchema,
    formatReleaseTagName,
    type ReleaseTagBlocker,
    type ReleaseTagPackage,
    type ReleaseTagPlan,
    releaseTagPlanSchema,
    type ReleaseTagPlanSummary,
} from './release-tag.js'
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
