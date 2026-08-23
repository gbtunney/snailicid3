import { describe, expect, it } from 'vitest'
import {
    createPullRequestPlan,
    formatPullRequestPlan,
    planWorkflowPullRequest,
    pullRequestPlanSchema,
    renderGhPrCreateCommand,
} from './pull-request-plan.js'

const identity = {
    branch: 'changeset/wacky-walker',
    mode: 'changeset' as const,
    slug: 'wacky-walker',
}

describe('pull request plans', () => {
    it('creates the canonical validated shape', () => {
        const plan = planWorkflowPullRequest('main', identity)

        expect(pullRequestPlanSchema.safeParse(plan).success).toBe(true)
        expect(plan.base).toBe('main')
        expect(plan.body).toContain('changeset/wacky-walker')
        expect(plan.head).toBe('changeset/wacky-walker')
        expect(plan.title).toBe('changeset: wacky-walker')
    })

    it('supports release branches with the same shape', () => {
        const plan = planWorkflowPullRequest('main', {
            branch: 'release/whole-banks-swim',
            mode: 'release',
            slug: 'whole-banks-swim',
        })

        expect(plan.title).toBe('release: whole-banks-swim')
        expect(plan.base).toBe('main')
    })

    it('includes the resolved scope in the PR title when provided', () => {
        const plan = planWorkflowPullRequest(
            'main',
            identity,
            'config,workspace',
        )

        expect(plan.title).toBe('changeset(config,workspace): wacky-walker')
    })

    it('renders readable output and a safely quoted gh command', () => {
        const plan = createPullRequestPlan({
            base: 'main',
            body: "body's ready",
            head: 'changeset/quote',
            title: "it's ready",
        })

        expect(formatPullRequestPlan(plan)).toContain('Pull request plan')
        expect(renderGhPrCreateCommand(plan)).toContain("'it'\\''s ready'")
        expect(renderGhPrCreateCommand(plan)).toContain("'body'\\''s ready'")
    })

    it('rejects an incomplete plan', () => {
        expect(() =>
            createPullRequestPlan({ base: '', body: '', head: '', title: '' }),
        ).toThrow()
    })
})
