import { runCommand } from '@snailicid3/node-utils'
import { getCurrentBranch } from './git.js'

/**
 * Branch-state assessment for the changeset/release workflow.
 *
 * The old `changeset-branch` script flatly refused to run unless you were on the base branch, with a clean tree, in
 * sync with origin. This module replaces that flat denial with an _assessment_ plus a pure decision function that
 * returns what to do — create, switch/relink, proceed, or (only when genuinely required) block — so the command can be
 * smart instead of obstinate.
 *
 * `decideBranchAction` is intentionally pure (no git, no IO) so the whole decision table is unit testable;
 * `gatherBranchState` collects the git facts it consumes.
 */

/** Local base branch position relative to its remote tracking branch. */
export type BaseSyncStatus =
    'ahead' | 'behind' | 'diverged' | 'in-sync' | 'unknown'

export type BranchActionKind =
    /** Only when genuinely impossible (detached HEAD, publish off base). */
    | 'block'
    /** Create the target branch from base. */
    | 'create'
    /** Already on the right branch; keep going. */
    | 'proceed'
    /** Relink: switch to the already-existing target branch. */
    | 'switch'

export type BranchDecision = {
    action: BranchActionKind
    /** True when the action proceeds with uncommitted changes in tow. */
    carriesDirtyChanges: boolean
    /** True when base is behind its remote (or target off an outdated base) — offer to update first. */
    offerUpdateWithBase: boolean
    /** One-line rationale for the chosen action. */
    reason: string
    /** The branch the action targets. */
    targetBranch: string
    /** Non-fatal advisories the command should surface. */
    warnings: Array<string>
}

/** The operation the caller is trying to perform. */
export type BranchOperation = 'continue' | 'publish' | 'start'

/** Durable branch prefixes the workflow understands. Branch names carry state, never commit scope. */
export type BranchPrefix = 'changeset' | 'release'

/** Everything the decision needs, gathered once from git. */
export type BranchState = {
    /** Resolved base branch (e.g. `main`). */
    baseBranch: string
    /** Local base vs its remote. */
    baseSync: BaseSyncStatus
    /** Branch currently checked out (empty string means detached HEAD). */
    currentBranch: string
    /** Classification of `currentBranch`. */
    currentKind: CurrentBranchKind
    /** True when `currentBranch === targetBranch`. */
    onTarget: boolean
    /** The `<prefix>/<slug>` branch this operation wants. */
    targetBranch: string
    /** Target branch exists locally. */
    targetExistsLocal: boolean
    /** Target branch exists on origin. */
    targetExistsRemote: boolean
    /** Working tree cleanliness. */
    workingTree: WorkingTreeStatus
}

/** What kind of branch we are currently sitting on. */
export type CurrentBranchKind = 'base' | 'changeset' | 'other' | 'release'

export type WorkingTreeStatus = 'clean' | 'dirty'

/** Classify a branch name against the known prefixes and the base branch. */
export const classifyBranchKind = (
    branch: string,
    baseBranch: string,
): CurrentBranchKind => {
    if (branch === baseBranch) return 'base'
    if (branch.startsWith('changeset/')) return 'changeset'
    if (branch.startsWith('release/')) return 'release'
    return 'other'
}

/**
 * Decide what to do with the current branch for a changeset/release operation.
 *
 * Pure: no git, no IO. Blocks are reserved for states that truly cannot proceed — detached HEAD, or a publish attempted
 * away from the base branch. Everything else resolves to create/switch/proceed with advisory warnings, replacing the
 * old flat denials for dirty trees and out-of-sync bases.
 */
export const decideBranchAction = (
    state: BranchState,
    operation: BranchOperation,
): BranchDecision => {
    const warnings: Array<string> = []
    const dirty = state.workingTree === 'dirty'
    const targetExists = state.targetExistsLocal || state.targetExistsRemote
    const baseBehind =
        state.baseSync === 'behind' || state.baseSync === 'diverged'

    const block = (reason: string): BranchDecision => ({
        action: 'block',
        carriesDirtyChanges: false,
        offerUpdateWithBase: false,
        reason,
        targetBranch: state.targetBranch,
        warnings,
    })

    if (state.currentBranch === '') {
        return block('detached HEAD — check out a branch before continuing.')
    }

    // Publishing is the one operation that must run from an in-sync base branch.
    if (operation === 'publish') {
        if (state.currentKind !== 'base') {
            return block(
                `publish must run from the base branch (${state.baseBranch}); currently on ${state.currentBranch}.`,
            )
        }
        if (baseBehind) {
            warnings.push(
                `${state.baseBranch} is ${state.baseSync} its remote — update before publishing.`,
            )
        }
        return {
            action: 'proceed',
            carriesDirtyChanges: dirty,
            offerUpdateWithBase: baseBehind,
            reason: `publish from ${state.baseBranch}.`,
            targetBranch: state.targetBranch,
            warnings,
        }
    }

    if (dirty) {
        warnings.push('working tree is dirty; changes will be carried along.')
    }

    // Already on the intended branch — nothing to move, just keep going.
    if (state.onTarget) {
        return {
            action: 'proceed',
            carriesDirtyChanges: dirty,
            offerUpdateWithBase: baseBehind,
            reason: `already on ${state.targetBranch}.`,
            targetBranch: state.targetBranch,
            warnings,
        }
    }

    // Relink: the target branch already exists (locally or on origin) — switch to it.
    if (targetExists) {
        const where = state.targetExistsLocal
            ? state.targetExistsRemote
                ? 'local and origin'
                : 'local'
            : 'origin'
        return {
            action: 'switch',
            carriesDirtyChanges: dirty,
            offerUpdateWithBase: baseBehind,
            reason: `relinking to existing ${state.targetBranch} (${where}).`,
            targetBranch: state.targetBranch,
            warnings,
        }
    }

    // Otherwise create the target branch from base.
    if (baseBehind) {
        warnings.push(
            `${state.baseBranch} is ${state.baseSync} its remote — update it so the new branch starts fresh.`,
        )
    }
    return {
        action: 'create',
        carriesDirtyChanges: dirty,
        offerUpdateWithBase: baseBehind,
        reason: `creating ${state.targetBranch} from ${state.baseBranch}.`,
        targetBranch: state.targetBranch,
        warnings,
    }
}

/** Run a git command in the repo and return trimmed stdout, or `undefined` on failure. */
const gitOut = (repoRoot: string, args: Array<string>): string | undefined => {
    const result = runCommand('git', args, { cwd: repoRoot })
    return result.success ? result.stdout.trim() : undefined
}

/** True when the working tree has staged, unstaged, or untracked changes. */
export const getWorkingTreeStatus = (repoRoot: string): WorkingTreeStatus =>
    gitOut(repoRoot, ['status', '--porcelain']) ? 'dirty' : 'clean'

/** Does a local branch exist? */
export const localBranchExists = (repoRoot: string, branch: string): boolean =>
    runCommand(
        'git',
        ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`],
        {
            cwd: repoRoot,
        },
    ).success

/** Does a branch exist on origin? */
export const remoteBranchExists = (repoRoot: string, branch: string): boolean =>
    Boolean(gitOut(repoRoot, ['ls-remote', '--heads', 'origin', branch]))

/** Compare a local branch to its `origin/<branch>` tracking branch. */
export const getBaseSyncStatus = (
    repoRoot: string,
    baseBranch: string,
): BaseSyncStatus => {
    const counts = gitOut(repoRoot, [
        'rev-list',
        '--left-right',
        '--count',
        `${baseBranch}...origin/${baseBranch}`,
    ])
    if (!counts) return 'unknown'

    const [aheadRaw, behindRaw] = counts.split(/\s+/)
    const ahead = Number(aheadRaw)
    const behind = Number(behindRaw)
    if (!Number.isFinite(ahead) || !Number.isFinite(behind)) return 'unknown'
    if (ahead === 0 && behind === 0) return 'in-sync'
    if (ahead > 0 && behind > 0) return 'diverged'
    return behind > 0 ? 'behind' : 'ahead'
}

/** Gather the full branch state for a target `<prefix>/<slug>` operation. */
export const gatherBranchState = (
    repoRoot: string,
    options: { baseBranch: string; slug: string; targetPrefix: BranchPrefix },
): BranchState => {
    const { baseBranch, slug, targetPrefix } = options
    const targetBranch = `${targetPrefix}/${slug}`
    const currentBranch = getCurrentBranch(repoRoot)

    return {
        baseBranch,
        baseSync: getBaseSyncStatus(repoRoot, baseBranch),
        currentBranch: currentBranch === 'HEAD' ? '' : currentBranch,
        currentKind: classifyBranchKind(currentBranch, baseBranch),
        onTarget: currentBranch === targetBranch,
        targetBranch,
        targetExistsLocal: localBranchExists(repoRoot, targetBranch),
        targetExistsRemote: remoteBranchExists(repoRoot, targetBranch),
        workingTree: getWorkingTreeStatus(repoRoot),
    }
}
