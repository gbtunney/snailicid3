import { describe, expect, it } from 'vitest'
import {
    createReleasePlan,
    type ReleasePackagePlanInput,
    type ReleasePlan,
} from './release-plan.js'
import { createReleaseTagPlan, formatReleaseTagName } from './release-tag.js'

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
    version: '0.2.0',
    versionState: { state: 'current' },
    ...overrides,
})

const planOf = (...packages: Array<ReleasePackagePlanInput>): ReleasePlan =>
    createReleasePlan({ packages })

const tag = (
    plan: ReleasePlan,
    selection: Array<string>,
    existingTags: Array<string> | null = [],
) => createReleaseTagPlan({ existingTags, plan, selection })

const entryFor = (plan: ReturnType<typeof tag>, name: string) =>
    plan.packages.find((entry) => entry.name === name)

describe('release tag planning', () => {
    describe('tag identity', () => {
        it('formats a tag the way every tag in this repository is formatted', () => {
            expect(formatReleaseTagName('@snailicid3/workspace', '0.2.0')).toBe(
                '@snailicid3/workspace@0.2.0',
            )
            expect(formatReleaseTagName('lodash', '4.18.1')).toBe(
                'lodash@4.18.1',
            )
        })

        it('is deterministic', () => {
            const plan = planOf(packageInput())

            expect(tag(plan, ['@snailicid3/workspace'])).toEqual(
                tag(plan, ['@snailicid3/workspace']),
            )
        })

        it.each([
            ['@snailicid3/workspace', 'next'],
            ['bad name', '1.0.0'],
            ['', '1.0.0'],
            ['@snailicid3/workspace', '0.2'],
        ])('rejects %s@%s as a tag identity', (name, version) => {
            expect(() => formatReleaseTagName(name, version)).toThrow()
        })

        it('carries a prerelease version through intact', () => {
            expect(
                formatReleaseTagName('@snailicid3/workspace', '0.2.0-beta.1'),
            ).toBe('@snailicid3/workspace@0.2.0-beta.1')
        })
    })

    describe('preparation prerequisite', () => {
        it('will not tag a version that preparation has not applied', () => {
            const plan = planOf(
                packageInput({
                    intent: {
                        bump: 'minor',
                        reason: 'Authored changeset',
                        source: 'changesets',
                    },
                    version: '0.1.0',
                    versionState: {
                        intendedVersion: '0.2.0',
                        state: 'pending',
                    },
                }),
            )
            const planned = tag(plan, ['@snailicid3/workspace'])

            expect(entryFor(planned, '@snailicid3/workspace')).toEqual({
                decision: 'blocked_preparation_incomplete',
                intendedVersion: '0.2.0',
                name: '@snailicid3/workspace',
                private: false,
                version: '0.1.0',
            })
            expect(planned.summary.planned).toBe(0)
            expect(planned.blockers).toContainEqual({
                reason: 'no_taggable_packages',
            })
        })

        it('tags a version preparation has applied', () => {
            const planned = tag(planOf(packageInput()), [
                '@snailicid3/workspace',
            ])

            expect(entryFor(planned, '@snailicid3/workspace')).toMatchObject({
                decision: 'planned',
                tag: '@snailicid3/workspace@0.2.0',
            })
        })

        it('does not tag merely because intent exists', () => {
            const plan = planOf(
                packageInput({
                    intent: {
                        bump: 'major',
                        reason: 'Authored changeset',
                        source: 'changesets',
                    },
                    version: '0.1.0',
                    versionState: {
                        intendedVersion: '1.0.0',
                        state: 'pending',
                    },
                }),
            )

            expect(
                JSON.stringify(tag(plan, ['@snailicid3/workspace'])),
            ).not.toContain('@snailicid3/workspace@1.0.0')
        })
    })

    describe('existing tags', () => {
        it('blocks a version that is already tagged', () => {
            const planned = tag(
                planOf(packageInput()),
                ['@snailicid3/workspace'],
                ['@snailicid3/workspace@0.2.0'],
            )

            expect(entryFor(planned, '@snailicid3/workspace')).toMatchObject({
                decision: 'blocked_already_tagged',
                tag: '@snailicid3/workspace@0.2.0',
            })
        })

        it('is not confused by a tag for a different version', () => {
            const planned = tag(
                planOf(packageInput()),
                ['@snailicid3/workspace'],
                ['@snailicid3/workspace@0.1.0'],
            )

            expect(entryFor(planned, '@snailicid3/workspace')?.decision).toBe(
                'planned',
            )
        })

        it('reports unknown rather than planned when the inventory cannot be read', () => {
            const planned = tag(
                planOf(packageInput()),
                ['@snailicid3/workspace'],
                null,
            )

            expect(entryFor(planned, '@snailicid3/workspace')).toMatchObject({
                decision: 'unknown_tag_inventory',
            })
            expect(planned.summary.unknown).toBe(1)
            expect(planned.summary.planned).toBe(0)
            expect(planned.blockers).toContainEqual({
                reason: 'tag_inventory_unavailable',
            })
        })

        it('never collapses an unreadable inventory into blocked or planned', () => {
            const entry = entryFor(
                tag(planOf(packageInput()), ['@snailicid3/workspace'], null),
                '@snailicid3/workspace',
            )

            expect(entry?.decision).not.toBe('planned')
            expect(entry?.decision.startsWith('blocked_')).toBe(false)
        })
    })

    describe('independence from npm', () => {
        it.each([
            'exists',
            'missing',
            'unknown_auth',
            'unknown_registry',
        ] as const)(
            'plans the same tag whatever the registry reports (%s)',
            (state) => {
                const planned = tag(
                    planOf(
                        packageInput({
                            registry: {
                                distTags: { latest: '9.9.9', next: '0.2.0' },
                                registryUrl: 'https://registry.npmjs.org/',
                                state,
                            },
                        }),
                    ),
                    ['@snailicid3/workspace'],
                )

                expect(
                    entryFor(planned, '@snailicid3/workspace'),
                ).toMatchObject({
                    decision: 'planned',
                    tag: '@snailicid3/workspace@0.2.0',
                })
            },
        )

        it('never reads a dist-tag into the tag identity', () => {
            const planned = tag(
                planOf(
                    packageInput({
                        registry: {
                            distTags: { latest: '9.9.9' },
                            registryUrl: 'https://registry.npmjs.org/',
                            state: 'exists',
                        },
                    }),
                ),
                ['@snailicid3/workspace'],
            )

            expect(JSON.stringify(planned)).not.toContain('9.9.9')
        })

        it('does not imply publish eligibility', () => {
            const serialized = JSON.stringify(
                tag(planOf(packageInput()), ['@snailicid3/workspace']),
            )

            expect(serialized).not.toContain('publish')
            expect(serialized).not.toContain('eligible')
        })
    })

    describe('selection', () => {
        it('never tags a package nobody selected', () => {
            const planned = tag(planOf(packageInput()), [])

            expect(entryFor(planned, '@snailicid3/workspace')?.decision).toBe(
                'not_selected',
            )
            expect(planned.blockers).toContainEqual({
                reason: 'no_selected_packages',
            })
        })

        it('names a selection entry the plan does not know', () => {
            expect(
                tag(planOf(packageInput()), [
                    '@snailicid3/workspace',
                    '@snailicid3/ghost',
                ]).blockers,
            ).toContainEqual({
                names: ['@snailicid3/ghost'],
                reason: 'unknown_selected_package',
            })
        })
    })

    describe('private packages', () => {
        it('tags a private package when its canonical state allows it', () => {
            const planned = tag(
                planOf(
                    packageInput({
                        name: '@snailicid3/doctor',
                        private: true,
                        version: '0.0.1',
                    }),
                ),
                ['@snailicid3/doctor'],
            )

            expect(entryFor(planned, '@snailicid3/doctor')).toMatchObject({
                decision: 'planned',
                private: true,
                tag: '@snailicid3/doctor@0.0.1',
            })
            expect(planned.summary.private).toBe(1)
        })
    })

    describe('boundaries', () => {
        it('leaves the observed plan untouched', () => {
            const plan = planOf(packageInput())
            const before = JSON.stringify(plan)

            tag(plan, ['@snailicid3/workspace'])

            expect(JSON.stringify(plan)).toBe(before)
        })

        it('declares its own schema version, separate from the observation', () => {
            const plan = planOf(packageInput())
            const planned = tag(plan, ['@snailicid3/workspace'])

            expect(planned.schemaVersion).toBe(1)
            expect(planned.operation).toBe('tag')
            expect(plan.execution.operation).toBe('observe')
        })
    })
})
