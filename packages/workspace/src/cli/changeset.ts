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
import { runCliIfEntrypoint, safeParseArgv } from '@snailicid3/node-utils'
import { z } from 'zod'
import {
    type BranchOperation,
    type BranchPrefix,
    decideBranchAction,
    deriveCommitFromBranch,
    gatherBranchState,
    getCurrentBranch,
    getRepoRoot,
    parseBranchName,
} from './../core/index.js'

const optionsSchema = z.object({
    append: z.string().optional(),
    base: z.string().optional(),
    json: z.boolean().optional().default(false),
    operation: z.enum(['continue', 'publish', 'start']).optional(),
    prefix: z.enum(['changeset', 'release']).optional(),
    scope: z.string().optional(),
    slug: z.string().optional(),
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
        return
    }

    printPlan(operation, state, decision, derivedCommit)
}

function printPlan(
    operation: BranchOperation,
    state: ReturnType<typeof gatherBranchState>,
    decision: ReturnType<typeof decideBranchAction>,
    derivedCommit: ReturnType<typeof deriveCommitFromBranch>,
): void {
    console.log(`operation:      ${operation}`)
    console.log(`current branch: ${state.currentBranch || '(detached HEAD)'}`)
    console.log(`base:           ${state.baseBranch} (${state.baseSync})`)
    console.log(`working tree:   ${state.workingTree}`)
    console.log(`target branch:  ${state.targetBranch}`)
    console.log(
        `target exists:  local=${String(state.targetExistsLocal)} origin=${String(state.targetExistsRemote)}`,
    )
    console.log(`decision:       ${decision.action} — ${decision.reason}`)
    if (decision.offerUpdateWithBase) {
        console.log(`update base:    offered (${state.baseBranch} not in sync)`)
    }
    if (decision.carriesDirtyChanges) {
        console.log('carries dirty:  yes')
    }
    for (const warning of decision.warnings) {
        console.log(`warning:        ${warning}`)
    }
    if (derivedCommit) {
        console.log(`commit (derived from branch): ${derivedCommit.message}`)
    }
}

export default main

runCliIfEntrypoint(import.meta, main, process.argv.slice(2))
