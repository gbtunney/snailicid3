import { runCommand } from '@snailicid3/node-utils'
import { type BranchDecision, type BranchState } from './branch-state.js'

/**
 * Git-mutating execution for the branch decision.
 *
 * `decideBranchAction` (pure) says what to do; this performs it: switch to an existing target (relink), create the
 * target from base, proceed (already there), or throw on a block. Kept small and separate so the decision stays
 * testable and the mutation is auditable in one place.
 */

export type ExecuteBranchOptions = {
    /** Print git output to the terminal instead of capturing it. */
    inherit?: boolean
    /**
     * When creating and the base is out of sync, branch from `origin/<base>` instead of the local base so the new
     * branch starts from the fetched tip. Caller is responsible for fetching first.
     */
    updateBase?: boolean
}

const runGitOrThrow = (
    repoRoot: string,
    args: Array<string>,
    inherit: boolean,
): void => {
    const result = runCommand('git', args, {
        cwd: repoRoot,
        ...(inherit ? { stdio: 'inherit' as const } : {}),
    })

    if (!result.success) {
        throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`)
    }
}

/** Switch to an existing branch (relink). Uncommitted changes are carried along by git. */
export const switchBranch = (
    repoRoot: string,
    branch: string,
    options: { inherit?: boolean } = {},
): void => {
    runGitOrThrow(repoRoot, ['switch', branch], options.inherit ?? false)
}

/** Create and switch to a new branch based on `startPoint`. */
export const createBranchFromBase = (
    repoRoot: string,
    branch: string,
    startPoint: string,
    options: { inherit?: boolean } = {},
): void => {
    runGitOrThrow(
        repoRoot,
        ['switch', '--create', branch, startPoint],
        options.inherit ?? false,
    )
}

/**
 * Perform the git operation for a decision.
 *
 * `block` throws, `proceed` is a no-op (already on the branch), `switch` relinks to the existing target, and `create`
 * branches from base (or `origin/<base>` when `updateBase` is set).
 */
export const executeBranchAction = (
    repoRoot: string,
    decision: BranchDecision,
    state: BranchState,
    options: ExecuteBranchOptions = {},
): void => {
    const inherit = options.inherit ?? false

    switch (decision.action) {
        case 'block':
            throw new Error(decision.reason)
        case 'proceed':
            return
        case 'create': {
            const startPoint =
                options.updateBase && decision.offerUpdateWithBase
                    ? `origin/${state.baseBranch}`
                    : state.baseBranch
            createBranchFromBase(repoRoot, decision.targetBranch, startPoint, {
                inherit,
            })
            return
        }
        case 'switch':
            switchBranch(repoRoot, decision.targetBranch, { inherit })
            return
    }
}
