import { z } from 'zod'
import type { WorkflowIdentity } from './workflow-plan.js'

/** Stable machine-readable description of the pull request a workflow should have. */
export const pullRequestPlanSchema = z.strictObject({
    base: z.string().min(1),
    body: z.string(),
    head: z.string().min(1),
    title: z.string().min(1),
})

export type PullRequestPlan = z.infer<typeof pullRequestPlanSchema>

export type PullRequestPlanInput = {
    base: string
    body?: string
    head: string
    title?: string
}

/** Create and validate the canonical pull request plan. */
export const createPullRequestPlan = (
    input: PullRequestPlanInput,
): PullRequestPlan =>
    pullRequestPlanSchema.parse({
        base: input.base,
        body: input.body ?? '',
        head: input.head,
        title: input.title ?? input.head,
    })

/** Build the initial workflow pull request metadata without requiring a commit or GitHub access. */
export const planWorkflowPullRequest = (
    base: string,
    identity: WorkflowIdentity,
    scope?: string,
): PullRequestPlan =>
    createPullRequestPlan({
        base,
        body: [
            `## ${identity.mode} workflow`,
            '',
            `This pull request carries the \`${identity.branch}\` workflow branch into \`${base}\`.`,
            '',
            'The branch remains the source of truth for subsequent workflow commits.',
        ].join('\n'),
        head: identity.branch,
        title: `${identity.mode}${scope ? `(${scope})` : ''}: ${identity.slug}`,
    })

/** Format a pull request plan for a human-readable terminal report. */
export const formatPullRequestPlan = (plan: PullRequestPlan): string =>
    [
        'Pull request plan',
        '',
        `  base:  ${plan.base}`,
        `  head:  ${plan.head}`,
        `  title: ${plan.title}`,
        '',
        'Body',
        plan.body,
    ].join('\n')

/** Quote one argument for a POSIX shell command without requiring eval. */
const shellQuote = (value: string): string =>
    `'${value.replaceAll("'", "'\\''")}'`

/** Render a copyable gh command; this string is for display only and is never executed by Workspace. */
export const renderGhPrCreateCommand = (plan: PullRequestPlan): string =>
    [
        'gh pr create',
        `--base ${shellQuote(plan.base)}`,
        `--head ${shellQuote(plan.head)}`,
        `--title ${shellQuote(plan.title)}`,
        `--body ${shellQuote(plan.body)}`,
    ].join(' ')
