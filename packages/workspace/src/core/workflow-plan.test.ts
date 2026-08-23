import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
    formatWorkflowPlan,
    gatherWorkflowFacts,
    getBaseRelation,
    inferWorkflowIdentity,
    listWorkflowBranches,
    planWorkflow,
    type WorkflowFacts,
} from './workflow-plan.js'

const facts = (overrides: Partial<WorkflowFacts> = {}): WorkflowFacts => ({
    aheadCount: 0,
    baseBranch: 'main',
    baseRelation: 'equal',
    behindCount: 0,
    currentBranch: 'changeset/wacky-walker',
    detached: false,
    identity: {
        branch: 'changeset/wacky-walker',
        mode: 'changeset',
        slug: 'wacky-walker',
    },
    matchingBranches: { local: [], remote: [] },
    remoteRelation: { aheadCount: 0, behindCount: 0, relation: 'unknown' },
    stagedFiles: [],
    workflowBranches: { local: [], remote: [] },
    workingTree: 'clean',
    ...overrides,
})

const actionIds = (input: WorkflowFacts): Array<string> =>
    planWorkflow(input).nextActions.map((action) => action.id)

describe('inferWorkflowIdentity', () => {
    it('infers mode and slug from both recognized prefixes', () => {
        expect(inferWorkflowIdentity('changeset/wacky-walker')).toEqual({
            branch: 'changeset/wacky-walker',
            mode: 'changeset',
            slug: 'wacky-walker',
        })
        expect(inferWorkflowIdentity('release/wacky-walker')).toEqual({
            branch: 'release/wacky-walker',
            mode: 'release',
            slug: 'wacky-walker',
        })
    })

    it('returns undefined for unrecognized branches and detached HEAD', () => {
        expect(inferWorkflowIdentity('main')).toBeUndefined()
        expect(inferWorkflowIdentity('feature/thing')).toBeUndefined()
        expect(inferWorkflowIdentity('changeset/')).toBeUndefined()
        expect(inferWorkflowIdentity('')).toBeUndefined()
    })
})

describe('planWorkflow', () => {
    it('offers the branch-derived commit once files are staged', () => {
        const plan = planWorkflow(facts({ stagedFiles: ['packages/a/x.ts'] }))

        expect(plan.unavailableReason).toBeUndefined()
        expect(plan.nextActions[0]).toMatchObject({ id: 'commit' })
        expect(plan.nextActions[0]?.consequence).toContain(
            'changeset(<scope>): wacky-walker',
        )
    })

    it('asks for staging rather than a commit when nothing is staged', () => {
        expect(actionIds(facts())).toEqual(['stage'])
    })

    it('explains why an unrecognized branch has no workflow', () => {
        const plan = planWorkflow(
            facts({
                currentBranch: 'feature/thing',
                identity: undefined,
            }),
        )

        expect(plan.unavailableReason).toContain('feature/thing')
        expect(plan.unavailableReason).toContain('not a changeset/*')
        expect(plan.nextActions[0]).toMatchObject({ id: 'start-changeset' })
    })

    it('reports detached HEAD as guidance rather than guessing a mode', () => {
        const plan = planWorkflow(
            facts({ currentBranch: '', detached: true, identity: undefined }),
        )

        expect(plan.unavailableReason).toContain('detached HEAD')
        expect(actionIds(plan.facts)).toContain('start-changeset')
    })

    it('offers resuming an existing workflow branch when one is known', () => {
        const plan = planWorkflow(
            facts({
                currentBranch: 'main',
                identity: undefined,
                workflowBranches: {
                    local: ['changeset/aa'],
                    remote: ['release/bb'],
                },
            }),
        )

        const resume = plan.nextActions.find(
            (action) => action.id === 'switch-workflow-branch',
        )

        expect(resume?.command).toBe('git switch changeset/aa')
        expect(resume?.consequence).toContain('release/bb')
    })

    it('marks a stacked state from ancestry, not from the branch name', () => {
        // Only the no-identity case proposes creating a new branch, so only it can be "stacked".
        expect(
            planWorkflow(
                facts({
                    aheadCount: 2,
                    currentBranch: 'main',
                    identity: undefined,
                }),
            ).stacked,
        ).toBe(true)
        expect(
            planWorkflow(
                facts({
                    aheadCount: 0,
                    currentBranch: 'main',
                    identity: undefined,
                }),
            ).stacked,
        ).toBe(false)
        // An existing workflow branch is not "created from here" by anything this plan offers next.
        expect(planWorkflow(facts({ aheadCount: 2 })).stacked).toBe(false)
    })

    it('offers a push once a workflow branch is committed and clean', () => {
        expect(
            actionIds(
                facts({
                    aheadCount: 1,
                    remoteRelation: {
                        aheadCount: 1,
                        behindCount: 0,
                        relation: 'unknown',
                    },
                }),
            ),
        ).toEqual(['push'])

        const plan = planWorkflow(facts({ aheadCount: 1 }))

        expect(plan.nextActions[0]).toMatchObject({
            command: 'git push -u origin changeset/wacky-walker',
            id: 'push',
        })
    })

    it('does not offer push when the remote workflow branch is equal', () => {
        expect(
            actionIds(
                facts({
                    aheadCount: 1,
                    remoteRelation: {
                        aheadCount: 0,
                        behindCount: 0,
                        relation: 'equal',
                    },
                }),
            ),
        ).toEqual([])
    })

    it('offers push when the remote workflow branch exists but local is ahead', () => {
        const plan = planWorkflow(
            facts({
                aheadCount: 2,
                remoteRelation: {
                    aheadCount: 1,
                    behindCount: 0,
                    relation: 'ahead',
                },
            }),
        )

        expect(actionIds(plan.facts)).toEqual(['push'])
        expect(plan.nextActions[0]?.consequence).toContain(
            'publishes the 1 unpushed changeset commit(s)',
        )
    })

    it('offers nothing further once the branch is already pushed', () => {
        expect(
            actionIds(
                facts({
                    aheadCount: 1,
                    matchingBranches: {
                        local: ['changeset/wacky-walker'],
                        remote: ['changeset/wacky-walker'],
                    },
                    remoteRelation: {
                        aheadCount: 0,
                        behindCount: 0,
                        relation: 'equal',
                    },
                }),
            ),
        ).toEqual([])
    })

    it('warns about dirty, behind and diverged states', () => {
        expect(planWorkflow(facts({ workingTree: 'dirty' })).warnings).toEqual([
            expect.stringContaining('dirty'),
        ])

        const behind = planWorkflow(
            facts({ baseRelation: 'behind', behindCount: 3 }),
        )

        expect(behind.warnings).toEqual([expect.stringContaining('behind')])
        expect(behind.nextActions.map((action) => action.id)).toContain(
            'update-base',
        )

        const diverged = planWorkflow(
            facts({ aheadCount: 1, baseRelation: 'diverged', behindCount: 2 }),
        )

        expect(diverged.warnings).toEqual([expect.stringContaining('diverged')])
    })

    it('warns when the base cannot be compared', () => {
        expect(
            planWorkflow(facts({ baseRelation: 'unknown' })).warnings,
        ).toEqual([expect.stringContaining('unable to compare')])
    })
})

describe('formatWorkflowPlan', () => {
    it('renders identity, ancestry and next actions', () => {
        const output = formatWorkflowPlan(
            planWorkflow(
                facts({
                    aheadCount: 2,
                    baseRelation: 'ahead',
                    matchingBranches: {
                        local: ['changeset/wacky-walker'],
                        remote: [],
                    },
                    stagedFiles: ['packages/config/src/index.ts'],
                }),
            ),
        )

        expect(output).toContain('changeset (slug: wacky-walker)')
        expect(output).toContain('ahead by 2 commit(s)')
        expect(output).toContain('no')
        expect(output).toContain('Matching workflow branches')
        expect(output).toContain('gbt-workflow commit [text]')
    })

    it('states the reason when no workflow is available', () => {
        const output = formatWorkflowPlan(
            planWorkflow(facts({ currentBranch: 'main', identity: undefined })),
        )

        expect(output).toContain('none — branch "main" is not a changeset/*')
        expect(output).toContain('gbt-changeset')
    })
})

const makeRepo = (): {
    git: (...args: Array<string>) => void
    root: string
} => {
    const root = mkdtempSync(path.join(tmpdir(), 'snail-workflow-'))
    const git = (...args: Array<string>): void => {
        execFileSync('git', args, { cwd: root, stdio: 'ignore' })
    }

    git('init', '-q', '-b', 'main')
    git('config', 'user.email', 'test@example.com')
    git('config', 'user.name', 'test')
    writeFileSync(path.join(root, 'tracked.txt'), 'v1\n')
    git('add', 'tracked.txt')
    git('commit', '-qm', 'init')

    return { git, root }
}

describe('gatherWorkflowFacts', () => {
    it('reads identity, staged files and workflow branches from a real repository', () => {
        const { git, root } = makeRepo()

        git('branch', 'changeset/other-slug')
        git('switch', '-q', '-c', 'changeset/wacky-walker')
        writeFileSync(path.join(root, 'staged.txt'), 'staged\n')
        git('add', 'staged.txt')
        writeFileSync(path.join(root, 'loose.txt'), 'loose\n')

        const gathered = gatherWorkflowFacts(root, { baseBranch: 'main' })

        expect(gathered.identity).toEqual({
            branch: 'changeset/wacky-walker',
            mode: 'changeset',
            slug: 'wacky-walker',
        })
        expect(gathered.stagedFiles).toEqual(['staged.txt'])
        expect(gathered.workingTree).toBe('dirty')
        expect(gathered.workflowBranches.local).toEqual([
            'changeset/other-slug',
            'changeset/wacky-walker',
        ])
        expect(gathered.matchingBranches.local).toEqual([
            'changeset/wacky-walker',
        ])
        // No origin/main in this fixture: the comparison is reported as unknown rather than fetched.
        expect(gathered.baseRelation).toBe('unknown')
    })

    it('reports detached HEAD without inferring a workflow', () => {
        const { git, root } = makeRepo()
        const head = execFileSync('git', ['rev-parse', 'HEAD'], {
            cwd: root,
            encoding: 'utf8',
        }).trim()

        git('checkout', '-q', head)

        const gathered = gatherWorkflowFacts(root, { baseBranch: 'main' })

        expect(gathered.detached).toBe(true)
        expect(gathered.identity).toBeUndefined()
    })

    it('measures ancestry against the local origin ref without fetching', () => {
        const { git, root } = makeRepo()

        // Simulate a fetched remote-tracking ref, then advance HEAD past it.
        git('update-ref', 'refs/remotes/origin/main', 'HEAD')
        writeFileSync(path.join(root, 'tracked.txt'), 'v2\n')
        git('add', 'tracked.txt')
        git('commit', '-qm', 'second')

        expect(getBaseRelation(root, 'main')).toEqual({
            aheadCount: 1,
            behindCount: 0,
            relation: 'ahead',
        })
        expect(
            planWorkflow(gatherWorkflowFacts(root, { baseBranch: 'main' }))
                .stacked,
        ).toBe(true)
    })

    it('measures workflow branch ancestry independently from base ancestry', () => {
        const { git, root } = makeRepo()

        git('switch', '-q', '-c', 'changeset/wacky-walker')
        git('update-ref', 'refs/remotes/origin/changeset/wacky-walker', 'HEAD')
        writeFileSync(path.join(root, 'tracked.txt'), 'v2\n')
        git('add', 'tracked.txt')
        git('commit', '-qm', 'second')

        const gathered = gatherWorkflowFacts(root, { baseBranch: 'main' })

        expect(gathered.remoteRelation).toEqual({
            aheadCount: 1,
            behindCount: 0,
            relation: 'ahead',
        })
        expect(planWorkflow(gathered).nextActions[0]?.id).toBe('push')
    })

    it('lists remote workflow branches from remote-tracking refs', () => {
        const { git, root } = makeRepo()

        git('update-ref', 'refs/remotes/origin/changeset/from-remote', 'HEAD')
        git('update-ref', 'refs/remotes/origin/feature/ignored', 'HEAD')

        expect(listWorkflowBranches(root).remote).toEqual([
            'changeset/from-remote',
        ])
    })
})
