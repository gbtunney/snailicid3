import { describe, expect, it } from 'vitest'
import {
    createReleasePlan,
    type ReleasePackagePlanInput,
    type ReleasePlan,
} from './release-plan.js'
import { createReleasePreparePlan } from './release-prepare.js'

const packageInput = (
    overrides: Partial<ReleasePackagePlanInput> = {},
): ReleasePackagePlanInput => ({
    doctor: { artifact: 'valid', dependencyClosure: 'valid' },
    gitTag: { selected: false },
    intent: { source: 'none' },
    name: '@snailicid3/workspace',
    policy: { decision: 'held', reason: 'No publish operation selected' },
    private: false,
    registry: {
        distTags: {},
        registryUrl: 'https://registry.npmjs.org/',
        state: 'missing',
    },
    version: '0.1.0',
    versionState: { state: 'current' },
    ...overrides,
})

const pending = (
    name: string,
    version: string,
    intendedVersion: string,
    overrides: Partial<ReleasePackagePlanInput> = {},
): ReleasePackagePlanInput =>
    packageInput({
        intent: {
            bump: 'minor',
            reason: 'Authored changeset',
            source: 'changesets',
        },
        name,
        version,
        versionState: { intendedVersion, state: 'pending' },
        ...overrides,
    })

const planOf = (...packages: Array<ReleasePackagePlanInput>): ReleasePlan =>
    createReleasePlan({ packages })

const prepare = (
    plan: ReleasePlan,
    selection: Array<string>,
    overrides: Partial<{
        baseBranch: string
        slug: string
        workingTree: 'clean' | 'dirty' | 'unknown'
    }> = {},
) =>
    createReleasePreparePlan({
        baseBranch: overrides.baseBranch ?? 'main',
        plan,
        selection,
        slug: overrides.slug ?? 'whole-banks-swim',
        workingTree: overrides.workingTree ?? 'clean',
    })

const decisionFor = (
    plan: ReturnType<typeof prepare>,
    name: string,
): string | undefined =>
    plan.packages.find((entry) => entry.name === name)?.decision

describe('release prepare planning', () => {
    describe('selection', () => {
        it('plans exactly the selected packages that have a pending version', () => {
            const plan = planOf(
                pending('@snailicid3/workspace', '0.1.0', '0.2.0'),
                pending('@snailicid3/config', '0.3.0', '0.4.0'),
            )
            const prepared = prepare(plan, ['@snailicid3/workspace'])

            expect(decisionFor(prepared, '@snailicid3/workspace')).toBe(
                'planned',
            )
            expect(decisionFor(prepared, '@snailicid3/config')).toBe(
                'not_selected',
            )
            expect(prepared.summary).toMatchObject({
                blocked: 0,
                packages: 2,
                planned: 1,
                selected: 1,
            })
        })

        it('plans several selected packages together', () => {
            const plan = planOf(
                pending('@snailicid3/workspace', '0.1.0', '0.2.0'),
                pending('@snailicid3/config', '0.3.0', '0.4.0'),
                pending('@snailicid3/logger', '0.1.0', '0.1.1'),
            )
            const prepared = prepare(plan, [
                '@snailicid3/workspace',
                '@snailicid3/config',
            ])

            expect(prepared.summary.planned).toBe(2)
            expect(
                prepared.packages
                    .filter((entry) => entry.decision === 'planned')
                    .map((entry) => entry.name),
            ).toEqual(['@snailicid3/workspace', '@snailicid3/config'])
        })

        it('is deterministic for the same inputs', () => {
            const plan = planOf(
                pending('@snailicid3/workspace', '0.1.0', '0.2.0'),
                pending('@snailicid3/config', '0.3.0', '0.4.0'),
            )
            const selection = ['@snailicid3/config', '@snailicid3/workspace']

            expect(prepare(plan, selection)).toEqual(prepare(plan, selection))
        })

        it('blocks a selected package with no pending version', () => {
            const prepared = prepare(
                planOf(packageInput({ name: '@snailicid3/workspace' })),
                ['@snailicid3/workspace'],
            )
            const entry = prepared.packages[0]

            expect(entry).toMatchObject({
                decision: 'blocked',
                reason: 'no_pending_version',
            })
            expect(prepared.blockers).toContainEqual({
                reason: 'no_preparable_packages',
            })
        })

        it('never prepares a pending package nobody selected', () => {
            const prepared = prepare(
                planOf(pending('@snailicid3/workspace', '0.1.0', '0.2.0')),
                [],
            )

            expect(decisionFor(prepared, '@snailicid3/workspace')).toBe(
                'not_selected',
            )
            expect(prepared.summary.planned).toBe(0)
            expect(prepared.blockers).toContainEqual({
                reason: 'no_selected_packages',
            })
        })
    })

    describe('blockers', () => {
        it('names a selection entry the plan does not know', () => {
            const prepared = prepare(
                planOf(pending('@snailicid3/workspace', '0.1.0', '0.2.0')),
                ['@snailicid3/workspace', '@snailicid3/ghost'],
            )

            expect(prepared.blockers).toContainEqual({
                names: ['@snailicid3/ghost'],
                reason: 'unknown_selected_package',
            })
        })

        it('keeps a dirty working tree distinct from an unknown one', () => {
            const plan = planOf(
                pending('@snailicid3/workspace', '0.1.0', '0.2.0'),
            )

            expect(
                prepare(plan, ['@snailicid3/workspace'], {
                    workingTree: 'dirty',
                }).blockers,
            ).toContainEqual({ reason: 'working_tree_dirty' })
            expect(
                prepare(plan, ['@snailicid3/workspace'], {
                    workingTree: 'unknown',
                }).blockers,
            ).toContainEqual({ reason: 'working_tree_unknown' })
            expect(
                prepare(plan, ['@snailicid3/workspace'], {
                    workingTree: 'clean',
                }).blockers,
            ).toEqual([])
        })

        it('treats an unstated working tree as unknown rather than clean', () => {
            const prepared = createReleasePreparePlan({
                baseBranch: 'main',
                plan: planOf(
                    pending('@snailicid3/workspace', '0.1.0', '0.2.0'),
                ),
                selection: ['@snailicid3/workspace'],
                slug: 'whole-banks-swim',
            })

            expect(prepared.blockers).toContainEqual({
                reason: 'working_tree_unknown',
            })
        })
    })

    describe('private packages', () => {
        it('prepares a private package like any other', () => {
            const prepared = prepare(
                planOf(
                    pending('@snailicid3/doctor', '0.0.0', '0.0.1', {
                        private: true,
                    }),
                ),
                ['@snailicid3/doctor'],
            )

            expect(prepared.packages[0]).toMatchObject({
                decision: 'planned',
                intendedVersion: '0.0.1',
                private: true,
            })
            expect(prepared.summary.private).toBe(1)
        })
    })

    describe('branch and pull request', () => {
        it('derives the release branch from the slug', () => {
            expect(
                prepare(
                    planOf(pending('@snailicid3/workspace', '0.1.0', '0.2.0')),
                    ['@snailicid3/workspace'],
                    { slug: 'whole-banks-swim' },
                ).branch,
            ).toBe('release/whole-banks-swim')
        })

        it('rejects a slug that is not a branch-safe identifier', () => {
            const plan = planOf(
                pending('@snailicid3/workspace', '0.1.0', '0.2.0'),
            )

            for (const slug of ['Whole Banks', 'release/nested', '', 'a--b']) {
                expect(() =>
                    prepare(plan, ['@snailicid3/workspace'], { slug }),
                ).toThrow()
            }
        })

        it('uses the canonical pull request contract and release title convention', () => {
            const prepared = prepare(
                planOf(
                    pending('@snailicid3/workspace', '0.1.0', '0.2.0'),
                    pending('@snailicid3/config', '0.3.0', '0.4.0'),
                ),
                ['@snailicid3/workspace', '@snailicid3/config'],
            )

            expect(prepared.pullRequest).toMatchObject({
                base: 'main',
                head: 'release/whole-banks-swim',
                title: 'release(config,workspace): version packages',
            })
            expect(prepared.pullRequest?.body).toContain(
                '@snailicid3/workspace',
            )
        })

        it('plans no pull request when nothing can be prepared', () => {
            expect(
                prepare(
                    planOf(packageInput({ name: '@snailicid3/workspace' })),
                    ['@snailicid3/workspace'],
                ).pullRequest,
            ).toBeNull()
        })
    })

    describe('boundaries', () => {
        it('does not imply publish eligibility', () => {
            const plan = planOf(
                pending('@snailicid3/workspace', '0.1.0', '0.2.0'),
            )
            const prepared = prepare(plan, ['@snailicid3/workspace'])
            const serialized = JSON.stringify(prepared)

            expect(serialized).not.toContain('publish')
            expect(serialized).not.toContain('eligible')
            expect(plan.packages[0]?.status).toBe('pending_held')
            expect(plan.packages[0]?.availableNextOperations).not.toContain(
                'publish',
            )
        })

        it('leaves the observed plan untouched', () => {
            const plan = planOf(
                pending('@snailicid3/workspace', '0.1.0', '0.2.0'),
            )
            const before = JSON.stringify(plan)

            prepare(plan, ['@snailicid3/workspace'])

            expect(JSON.stringify(plan)).toBe(before)
        })

        it('declares its own schema version, separate from the observation', () => {
            const plan = planOf(
                pending('@snailicid3/workspace', '0.1.0', '0.2.0'),
            )
            const prepared = prepare(plan, ['@snailicid3/workspace'])

            expect(prepared.schemaVersion).toBe(1)
            expect(prepared.operation).toBe('prepare')
            expect(plan.schemaVersion).toBe(1)
            expect(plan.execution.operation).toBe('observe')
        })
    })
})
