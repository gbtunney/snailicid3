import { runCommand } from '@snailicid3/node-utils'
import { splitNonEmptyLines } from './array.js'
import { parseBranchName } from './branch-commit.js'
import { type BranchPrefix, getWorkingTreeStatus } from './branch-state.js'
import { getStagedFiles } from './commit-scope.js'
import { getCurrentBranch } from './git.js'

/**
 * Read-only assessment of the changeset/release workflow.
 *
 * Planning is the default operation and it never mutates: no fetch, no branch creation, no staging, no commit. It reads
 * refs that already exist locally and reports what is true plus what the caller may explicitly do next. Remote facts
 * therefore come from `refs/remotes/origin/*` — the last fetched state — because reaching for the network to freshen
 * them would make a read-only report perform IO the caller did not ask for.
 *
 * `planWorkflow` is pure so the whole decision table is unit testable; `gatherWorkflowFacts` collects the git facts it
 * consumes.
 */

/** Position of `HEAD` relative to `origin/<base>`, measured by commit ancestry rather than branch name. */
export type BaseRelation = 'ahead' | 'behind' | 'diverged' | 'equal' | 'unknown'

export type WorkflowActionId =
    | 'commit'
    | 'push'
    | 'stage'
    | 'start-changeset'
    | 'switch-workflow-branch'
    | 'update-base'

export type WorkflowBranches = {
    local: Array<string>
    /** Remote-tracking names under `origin/`, with the remote prefix stripped. */
    remote: Array<string>
}

/** Everything the plan needs, gathered once from git. */
export type WorkflowFacts = {
    /** Commits on `HEAD` that `origin/<base>` does not have. */
    aheadCount: number
    baseBranch: string
    baseRelation: BaseRelation
    /** Commits on `origin/<base>` that `HEAD` does not have. */
    behindCount: number
    /** Branch currently checked out; empty string means detached HEAD. */
    currentBranch: string
    detached: boolean
    /** Workflow identity inferred from the current branch, when it is a recognized one. */
    identity: undefined | WorkflowIdentity
    /** Workflow branches sharing the current slug. Empty without an identity. */
    matchingBranches: WorkflowBranches
    /** Files staged for the next commit. */
    stagedFiles: Array<string>
    /** Every recognized workflow branch known locally. */
    workflowBranches: WorkflowBranches
    workingTree: 'clean' | 'dirty'
}

/** The identity a recognized workflow branch carries for the life of the branch. */
export type WorkflowIdentity = {
    /** The branch the identity was read from. */
    branch: string
    /** Commit type, taken from the branch prefix. */
    mode: BranchPrefix
    /** Durable slug, taken from the rest of the branch name. */
    slug: string
}

/** An action the caller may take. Listing one never performs it. */
export type WorkflowNextAction = {
    /** The exact command to run. */
    command: string
    /** What running it would do. */
    consequence: string
    id: WorkflowActionId
}

export type WorkflowPlan = {
    facts: WorkflowFacts
    nextActions: Array<WorkflowNextAction>
    /**
     * True when a branch created from here would carry commits that `origin/<base>` does not have — i.e. it would stack
     * on top of unmerged work rather than branch cleanly from the base.
     */
    stacked: boolean
    /** Why no workflow identity is available. Undefined when one is. */
    unavailableReason: string | undefined
    /** Non-fatal advisories. */
    warnings: Array<string>
}

/** Infer the workflow identity a branch carries, or `undefined` when the branch is not a recognized one. */
export const inferWorkflowIdentity = (
    branch: string,
): undefined | WorkflowIdentity => {
    const parsed = parseBranchName(branch)
    if (!parsed) return undefined

    return { branch: branch.trim(), mode: parsed.prefix, slug: parsed.slug }
}

/**
 * Build the read-only plan from gathered facts.
 *
 * Pure: no git, no IO. Unrecognized branches and detached HEAD produce a stated reason and guidance rather than a
 * guessed workflow, so the caller is never silently opted into a mode it did not choose.
 */
export const planWorkflow = (facts: WorkflowFacts): WorkflowPlan => {
    const warnings: Array<string> = []
    const nextActions: Array<WorkflowNextAction> = []
    // An existing workflow branch is not "created from here" by anything this plan offers next, so only the no-identity
    // case — about to run `gbt-changeset` — can stack a new branch on unmerged commits.
    const stacked = !facts.identity && facts.aheadCount > 0

    if (facts.workingTree === 'dirty') {
        warnings.push(
            'working tree is dirty; only staged files are recorded by a commit.',
        )
    }

    if (facts.baseRelation === 'behind' || facts.baseRelation === 'diverged') {
        warnings.push(
            `HEAD is ${facts.baseRelation} origin/${facts.baseBranch} by ${facts.behindCount.toString()} commit(s).`,
        )
    }

    if (facts.baseRelation === 'unknown') {
        warnings.push(
            `unable to compare HEAD with origin/${facts.baseBranch}; the remote-tracking ref may be missing.`,
        )
    }

    const unavailableReason = facts.detached
        ? 'detached HEAD — check out a changeset/* or release/* branch to resume a workflow.'
        : facts.identity
          ? undefined
          : `branch "${facts.currentBranch}" is not a changeset/* or release/* branch, so no workflow mode can be inferred.`

    if (facts.identity) {
        if (facts.stagedFiles.length > 0) {
            nextActions.push({
                command: 'gbt-workflow commit [text]',
                consequence: `commits the ${facts.stagedFiles.length.toString()} staged file(s) as ${facts.identity.mode}(<scope>): ${facts.identity.slug}, with the scope resolved from those files.`,
                id: 'commit',
            })
        } else if (
            facts.aheadCount > 0 &&
            !facts.matchingBranches.remote.includes(facts.currentBranch)
        ) {
            nextActions.push({
                command: `git push -u origin ${facts.currentBranch}`,
                consequence: `publishes the ${facts.aheadCount.toString()} local ${facts.identity.mode} commit(s); open a pull request against origin/${facts.baseBranch} once it is pushed.`,
                id: 'push',
            })
        } else if (facts.aheadCount === 0) {
            nextActions.push({
                command: 'git add <path>',
                consequence: `stages files for the next ${facts.identity.mode} commit; nothing is staged, so there is nothing to commit yet.`,
                id: 'stage',
            })
        }
    } else {
        nextActions.push({
            command: 'gbt-changeset',
            consequence:
                'creates one changeset file and switches to its changeset/<slug> branch. It does not stage, commit or push.',
            id: 'start-changeset',
        })

        const resumable = [
            ...new Set([
                ...facts.workflowBranches.local,
                ...facts.workflowBranches.remote,
            ]),
        ].toSorted()

        if (resumable.length > 0) {
            nextActions.push({
                command: `git switch ${resumable[0] ?? ''}`,
                consequence: `resumes an existing workflow branch (${resumable.length.toString()} available: ${resumable.join(', ')}).`,
                id: 'switch-workflow-branch',
            })
        }
    }

    if (facts.baseRelation === 'behind' || facts.baseRelation === 'diverged') {
        nextActions.push({
            command: `git fetch origin ${facts.baseBranch}`,
            consequence: `refreshes origin/${facts.baseBranch}; this plan reports the last fetched state and never fetches on its own.`,
            id: 'update-base',
        })
    }

    return { facts, nextActions, stacked, unavailableReason, warnings }
}

const pad = (label: string): string => label.padEnd(16, ' ')

const describeRelation = (facts: WorkflowFacts): string => {
    switch (facts.baseRelation) {
        case 'ahead':
            return `ahead by ${facts.aheadCount.toString()} commit(s)`
        case 'behind':
            return `behind by ${facts.behindCount.toString()} commit(s)`
        case 'diverged':
            return `diverged (ahead ${facts.aheadCount.toString()}, behind ${facts.behindCount.toString()})`
        case 'equal':
            return 'equal'
        case 'unknown':
            return 'unknown'
    }
}

/** Render the plan as plain text. Kept free of terminal styling so the output is directly assertable. */
export const formatWorkflowPlan = (plan: WorkflowPlan): string => {
    const { facts } = plan
    const lines: Array<string> = ['Workflow plan', '']

    lines.push(
        `  ${pad('branch')}${facts.detached ? 'detached HEAD' : facts.currentBranch}`,
        `  ${pad('workflow')}${
            facts.identity
                ? `${facts.identity.mode} (slug: ${facts.identity.slug})`
                : `none — ${plan.unavailableReason ?? 'no workflow branch'}`
        }`,
        `  ${pad('working tree')}${facts.workingTree}`,
        `  ${pad('base')}origin/${facts.baseBranch}`,
        `  ${pad('base relation')}${describeRelation(facts)}`,
        `  ${pad('stacked')}${
            plan.stacked
                ? `yes — a new branch here would stack on ${facts.aheadCount.toString()} unmerged commit(s)`
                : 'no'
        }`,
        `  ${pad('staged files')}${facts.stagedFiles.length.toString()}`,
    )

    const { local, remote } = facts.identity
        ? facts.matchingBranches
        : facts.workflowBranches
    const heading = facts.identity
        ? 'Matching workflow branches'
        : 'Workflow branches'

    if (local.length > 0 || remote.length > 0) {
        lines.push(
            '',
            heading,
            `  ${pad('local')}${local.length > 0 ? local.join(', ') : '(none)'}`,
            `  ${pad('origin')}${remote.length > 0 ? remote.join(', ') : '(none)'}`,
        )
    }

    if (plan.warnings.length > 0) {
        lines.push(
            '',
            'Warnings',
            ...plan.warnings.map((warning) => `  - ${warning}`),
        )
    }

    lines.push('', 'Next actions')

    for (const action of plan.nextActions) {
        lines.push(`  ${action.command}`, `      ${action.consequence}`)
    }

    return lines.join('\n')
}

/** Run a git command in the repo and return trimmed stdout, or `undefined` on failure. */
const gitOut = (
    repoRoot: string,
    args: ReadonlyArray<string>,
): string | undefined => {
    const result = runCommand('git', [...args], { cwd: repoRoot })
    return result.success ? result.stdout.trim() : undefined
}

/**
 * List recognized workflow branches from refs that already exist locally.
 *
 * `for-each-ref` is used rather than `ls-remote` deliberately: planning stays offline, so `remote` reports the last
 * fetched state instead of silently making a network call.
 */
export const listWorkflowBranches = (repoRoot: string): WorkflowBranches => {
    const read = (
        prefix: string,
        patterns: ReadonlyArray<string>,
    ): Array<string> =>
        splitNonEmptyLines(
            gitOut(repoRoot, [
                'for-each-ref',
                '--format=%(refname:short)',
                ...patterns,
            ]) ?? '',
        )
            .map((ref) => (prefix ? ref.replace(prefix, '') : ref))
            .filter((ref) => parseBranchName(ref) !== undefined)
            .toSorted()

    return {
        local: read('', ['refs/heads/changeset', 'refs/heads/release']),
        remote: read('origin/', [
            'refs/remotes/origin/changeset',
            'refs/remotes/origin/release',
        ]),
    }
}

/** Compare `HEAD` with `origin/<base>` by ancestry. */
export const getBaseRelation = (
    repoRoot: string,
    baseBranch: string,
): { aheadCount: number; behindCount: number; relation: BaseRelation } => {
    const counts = gitOut(repoRoot, [
        'rev-list',
        '--left-right',
        '--count',
        `HEAD...origin/${baseBranch}`,
    ])
    const unknown = {
        aheadCount: 0,
        behindCount: 0,
        relation: 'unknown' as const,
    }

    if (!counts) return unknown

    const [aheadRaw, behindRaw] = counts.split(/\s+/u)
    const aheadCount = Number(aheadRaw)
    const behindCount = Number(behindRaw)

    if (!Number.isFinite(aheadCount) || !Number.isFinite(behindCount)) {
        return unknown
    }

    const relation: BaseRelation =
        aheadCount === 0 && behindCount === 0
            ? 'equal'
            : aheadCount > 0 && behindCount > 0
              ? 'diverged'
              : behindCount > 0
                ? 'behind'
                : 'ahead'

    return { aheadCount, behindCount, relation }
}

/** Gather every fact the plan reports. Read-only: nothing here fetches, stages, commits or switches. */
export const gatherWorkflowFacts = (
    repoRoot: string,
    options: { baseBranch: string },
): WorkflowFacts => {
    const rawBranch = getCurrentBranch(repoRoot)
    const currentBranch = rawBranch === 'HEAD' ? '' : rawBranch
    const identity = inferWorkflowIdentity(currentBranch)
    const workflowBranches = listWorkflowBranches(repoRoot)
    const { aheadCount, behindCount, relation } = getBaseRelation(
        repoRoot,
        options.baseBranch,
    )

    const matches = (branch: string): boolean =>
        identity !== undefined &&
        parseBranchName(branch)?.slug === identity.slug

    return {
        aheadCount,
        baseBranch: options.baseBranch,
        baseRelation: relation,
        behindCount,
        currentBranch,
        detached: currentBranch === '',
        identity,
        matchingBranches: {
            local: workflowBranches.local.filter(matches),
            remote: workflowBranches.remote.filter(matches),
        },
        stagedFiles: getStagedFiles(repoRoot),
        workflowBranches,
        workingTree: getWorkingTreeStatus(repoRoot),
    }
}
