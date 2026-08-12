#!/usr/bin/env node

/**
 * Branch-aware changeset/release command (formerly the `changeset-branch` shell script).
 *
 * This is the Node entry built on the new argv-schema primitives. For now it implements the read-only ASSESSMENT: it
 * resolves the target `<prefix>/<slug>` branch, gathers git state, runs the smart decision (create / switch / relink /
 * proceed / block instead of flat denial), and derives the commit metadata straight from the branch name — no hidden
 * pending-message file. The git-mutating execution (create/switch, changeset CLI, `--commit`, `--pr`) wires onto this
 * same decision next.
 */
import {
    runCliIfEntrypoint,
    runCommand,
    safeParseArgv,
} from '@snailicid3/node-utils'
import { fmt } from '@snailicid3/utils'
import { z } from 'zod'
import {
    type BranchOperation,
    type BranchPrefix,
    decideBranchAction,
    deriveCommitFromBranch,
    executeBranchAction,
    gatherBranchState,
    getCurrentBranch,
    getRepoRoot,
    parseBranchName,
} from './../core/index.js'

const optionsSchema = z.object({
    append: z.string().optional(),
    apply: z.boolean().optional().default(false),
    base: z.string().optional(),
    json: z.boolean().optional().default(false),
    operation: z.enum(['continue', 'publish', 'start']).optional(),
    prefix: z.enum(['changeset', 'release']).optional(),
    scope: z.string().optional(),
    slug: z.string().optional(),
    updateBase: z.boolean().optional().default(false),
})

type Options = z.output<typeof optionsSchema>

const resolveBaseBranch = (option: string | undefined): string =>
    option?.trim() || process.env.BASE_BRANCH?.trim() || 'main'

/** Resolve the target prefix + slug from flags, falling back to the current branch name. */
const resolveTarget = (
    options: Options,
    currentBranch: string,
): undefined | { prefix: BranchPrefix; slug: string } => {
    const fromBranch = parseBranchName(currentBranch)
    const prefix = options.prefix ?? fromBranch?.prefix
    const slug = options.slug?.trim() || fromBranch?.slug

    if (!prefix || !slug) return undefined
    return { prefix, slug }
}

const resolveOperation = (
    options: Options,
    currentBranch: string,
): BranchOperation => {
    if (options.operation) return options.operation
    return parseBranchName(currentBranch) ? 'continue' : 'start'
}

export function main(args: Array<string> = process.argv.slice(2)): void {
    const parsed = safeParseArgv(optionsSchema, args)
    if (!parsed.success) {
        throw new Error(`invalid arguments:\n${z.prettifyError(parsed.error)}`)
    }
    const options = parsed.data

    const repoRoot = getRepoRoot({ fallbackToCwd: true })
    const currentBranch = getCurrentBranch(repoRoot)
    const baseBranch = resolveBaseBranch(options.base)
    const target = resolveTarget(options, currentBranch)

    if (!target) {
        const message =
            'No target branch determinable. Run from a changeset/* or release/* branch, ' +
            'or pass --prefix <changeset|release> --slug <slug>.'
        if (options.json) {
            console.log(JSON.stringify({ currentBranch, error: message }))
            return
        }
        console.log(message)
        return
    }

    const operation = resolveOperation(options, currentBranch)
    const state = gatherBranchState(repoRoot, {
        baseBranch,
        slug: target.slug,
        targetPrefix: target.prefix,
    })
    const decision = decideBranchAction(state, operation)
    const derivedCommit = deriveCommitFromBranch(state.targetBranch, {
        append: options.append,
        scope: options.scope?.trim() || 'root',
    })

    if (options.json) {
        console.log(
            JSON.stringify({ decision, derivedCommit, operation, state }),
        )
    } else {
        printPlan(operation, state, decision, derivedCommit)
    }

    // Mutation is opt-in. Without --apply the command is a read-only plan.
    if (options.apply) {
        if (options.updateBase && decision.offerUpdateWithBase) {
            runCommand('git', ['fetch', 'origin', baseBranch], {
                cwd: repoRoot,
                stdio: 'inherit',
            })
        }
        executeBranchAction(repoRoot, decision, state, {
            inherit: true,
            updateBase: options.updateBase,
        })
        console.log(fmt`applied — now on ${getCurrentBranch(repoRoot)}`)
    }
}

function printPlan(
    operation: BranchOperation,
    state: ReturnType<typeof gatherBranchState>,
    decision: ReturnType<typeof decideBranchAction>,
    derivedCommit: ReturnType<typeof deriveCommitFromBranch>,
): void {
    console.log(fmt`operation:      ${operation}`)
    console.log(
        fmt`current branch: ${state.currentBranch || '(detached HEAD)'}`,
    )
    console.log(fmt`base:           ${state.baseBranch} (${state.baseSync})`)
    console.log(fmt`working tree:   ${state.workingTree}`)
    console.log(fmt`target branch:  ${state.targetBranch}`)
    console.log(
        fmt`target exists:  local=${state.targetExistsLocal} origin=${state.targetExistsRemote}`,
    )
    console.log(fmt`decision:       ${decision.action} — ${decision.reason}`)
    if (decision.offerUpdateWithBase) {
        console.log(
            fmt`update base:    offered (${state.baseBranch} not in sync)`,
        )
    }
    if (decision.carriesDirtyChanges) {
        console.log('carries dirty:  yes')
    }
    for (const warning of decision.warnings) {
        console.log(fmt`warning:        ${warning}`)
    }
    if (derivedCommit) {
        console.log(fmt`commit (derived from branch): ${derivedCommit.message}`)
    }
}

export default main

runCliIfEntrypoint(import.meta, main, process.argv.slice(2))
