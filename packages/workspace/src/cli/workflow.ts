#!/usr/bin/env node

/**
 * The local, branch-aware changeset/release workflow command.
 *
 * `plan` is the default and is strictly read-only. `commit` is the explicitly invoked mutation: it derives the commit
 * type and slug from the current workflow branch, resolves the scope from the files staged for that individual commit,
 * and records it. Nothing else here stages, pushes or touches a pull request.
 */
import { runCliIfEntrypointAsync, safeParseArgv } from '@snailicid3/node-utils'
import { z } from 'zod'
import { deriveCommitFromBranch } from './../core/branch-commit.js'
import {
    performCommit,
    requireStagedChanges,
    validateCommitMessage,
} from './../core/commit-exec.js'
import { getStagedFiles, resolveCommitScopes } from './../core/commit-scope.js'
import { readWorkspaceEnvironment } from './../core/environment.js'
import { getRepoRoot, resolveBaseBranch } from './../core/git.js'
import { formatScopes } from './../core/scopes.js'
import {
    formatWorkflowPlan,
    gatherWorkflowFacts,
    planWorkflow,
    type WorkflowPlan,
} from './../core/workflow-plan.js'

export const optionsSchema = z.strictObject({
    base: z.string().optional(),
    dry: z.boolean().optional(),
    dryRun: z.boolean().optional(),
    fullScope: z.boolean().optional(),
    h: z.boolean().optional(),
    help: z.boolean().optional(),
    json: z.boolean().optional(),
    keepPrefix: z.boolean().optional(),
    n: z.boolean().optional(),
    scope: z.string().optional(),
})

export type ParsedWorkflowArgs = {
    append: string
    baseOverride: string
    command: WorkflowCommand
    dryRun: boolean
    explicitScope: string
    json: boolean
    keepPrefix: boolean
}

export type WorkflowCommand = 'commit' | 'plan'

const HELP = `Usage:
  gbt-workflow [plan] [--base <branch>] [--json]
  gbt-workflow commit [text ...] [--scope <scope>] [--keep-prefix] [--dry-run]

Commands:
  plan      Read-only status and the exact next actions. Never mutates the repository. (default)
  commit    Commit the staged files, deriving the type and slug from the current
            changeset/* or release/* branch and the scope from those staged files.

Options:
  --base <branch>   Base branch to compare against. Defaults to origin/HEAD, then main.
  --scope <scope>   Override the resolved commit scope.
  --keep-prefix     Keep full package names instead of shortened scopes.
  --dry-run         Print the commit message without committing.
  --json            Emit the plan as JSON.`

/** Split argv into the workflow command, its trailing text, and the named options. */
export const parseWorkflowArgs = (
    args: ReadonlyArray<string>,
): ParsedWorkflowArgs => {
    const parsed = safeParseArgv(optionsSchema, args, z.array(z.string()))

    if (!parsed.success) {
        throw new Error(`invalid arguments:\n${z.prettifyError(parsed.error)}`)
    }

    const options = parsed.data.options
    const [first, ...rest] = parsed.data.positionals

    if (options.help === true || options.h === true) {
        console.log(HELP)
        process.exit(0)
    }

    // `plan` is the default, so a bare `gbt-workflow` and an explicit `gbt-workflow plan` agree. Any other
    // leading token is treated as commit text rather than a mistyped command, because `commit` is the only
    // subcommand that accepts free text and silently dropping it would lose the user's message.
    const command: WorkflowCommand = first === 'commit' ? 'commit' : 'plan'
    const append =
        command === 'commit'
            ? rest.join(' ').trim()
            : first === 'plan'
              ? ''
              : [first, ...rest].filter(Boolean).join(' ').trim()

    if (command === 'plan' && append) {
        throw new Error(
            `unknown command "${append.split(' ')[0] ?? ''}". Run "gbt-workflow --help".`,
        )
    }

    return {
        append,
        baseOverride: options.base?.trim() ?? '',
        command,
        dryRun:
            options.dryRun === true ||
            options.dry === true ||
            options.n === true,
        explicitScope: options.scope?.trim() ?? '',
        json: options.json === true,
        keepPrefix: options.keepPrefix === true || options.fullScope === true,
    }
}

/** Build the read-only plan for a repository. Exported so callers can consume the plan without the CLI. */
export const buildPlan = (repoRoot: string, baseBranch: string): WorkflowPlan =>
    planWorkflow(gatherWorkflowFacts(repoRoot, { baseBranch }))

export async function main(
    args: Array<string> = process.argv.slice(2),
): Promise<void> {
    const parsed = parseWorkflowArgs(args)
    const repoRoot = getRepoRoot()
    const environment = readWorkspaceEnvironment(process.env)
    const baseBranch = resolveBaseBranch(
        repoRoot,
        parsed.baseOverride,
        environment.baseBranch,
    )

    if (parsed.command === 'plan') {
        const plan = buildPlan(repoRoot, baseBranch)

        console.log(
            parsed.json
                ? JSON.stringify(plan, undefined, 2)
                : formatWorkflowPlan(plan),
        )
        return
    }

    await runBranchDerivedCommit(repoRoot, baseBranch, parsed)
}

/**
 * Commit the staged files using the branch's durable identity.
 *
 * The branch supplies the type and slug even after Changesets has deleted the original Markdown file, which is why the
 * branch — not the changeset file — is the source of workflow identity.
 */
const runBranchDerivedCommit = async (
    repoRoot: string,
    baseBranch: string,
    parsed: ParsedWorkflowArgs,
): Promise<void> => {
    const plan = buildPlan(repoRoot, baseBranch)
    const { identity } = plan.facts

    if (!identity) {
        throw new Error(
            [
                plan.unavailableReason ?? 'no workflow branch.',
                'Run "gbt-workflow" to see the available next actions.',
            ].join('\n'),
        )
    }

    requireStagedChanges(repoRoot)

    const scopeValue = parsed.explicitScope
        ? parsed.explicitScope
        : formatScopes(
              (
                  await resolveCommitScopes(
                      repoRoot,
                      getStagedFiles(repoRoot),
                      {
                          keepPrefix: parsed.keepPrefix,
                      },
                  )
              ).scopes,
              'csv',
          )

    const derived = deriveCommitFromBranch(identity.branch, {
        ...(parsed.append ? { append: parsed.append } : {}),
        scope: scopeValue,
    })

    if (!derived) {
        throw new Error(
            `unable to derive a commit from branch "${identity.branch}".`,
        )
    }

    await validateCommitMessage(repoRoot, derived.message)

    if (parsed.dryRun) {
        console.log(derived.message)
        return
    }

    performCommit(repoRoot, derived.message)
}

export default main

await runCliIfEntrypointAsync(import.meta, main, process.argv.slice(2))
