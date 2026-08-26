import { describe, expect, it } from 'vitest'
import {
    createReleasePlan,
    type ReleasePackagePlanInput,
    type ReleasePlan,
} from './release-plan.js'
import {
    createReleasePublishPlan,
    type ReleasePublishCandidate,
} from './release-publish.js'

const INTEGRITY = `sha512-${'a'.repeat(86)}==`

const packageInput = (
    overrides: Partial<ReleasePackagePlanInput> = {},
): ReleasePackagePlanInput => ({
    doctor: { artifact: 'valid', dependencyClosure: 'valid' },
    gitTag: { selected: false },
    intent: { source: 'none' },
    name: '@snailicid3/workspace',
    policy: {
        channel: 'latest',
        decision: 'selected',
        reason: 'Explicit release operation',
    },
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

const candidate = (
    overrides: Partial<ReleasePublishCandidate> = {},
): ReleasePublishCandidate => ({
    artifact: {
        integrity: INTEGRITY,
        name: '@snailicid3/workspace',
        tarball: 'releases/snailicid3-workspace-0.2.0.tgz',
        version: '0.2.0',
    },
    doctor: { artifact: 'valid', closure: { edges: [], state: 'valid' } },
    name: '@snailicid3/workspace',
    ...overrides,
})

const planOf = (...packages: Array<ReleasePackagePlanInput>): ReleasePlan =>
    createReleasePlan({ packages })

const publish = (
    plan: ReleasePlan,
    selection: Array<string>,
    candidates: Array<ReleasePublishCandidate> = [candidate()],
    channel = 'latest',
) => createReleasePublishPlan({ candidates, channel, plan, selection })

const entryFor = (plan: ReturnType<typeof publish>, name: string) =>
    plan.packages.find((entry) => entry.name === name)

describe('release publish planning', () => {
    describe('explicit selection', () => {
        it('publishes nothing when nothing is selected', () => {
            const planned = publish(planOf(packageInput()), [])

            expect(planned.summary.planned).toBe(0)
            expect(entryFor(planned, '@snailicid3/workspace')?.decision).toBe(
                'not_selected',
            )
            expect(planned.authorization).toEqual({
                reasons: ['no_selected_packages'],
                state: 'withheld',
            })
        })

        it('plans one explicitly selected eligible package', () => {
            const planned = publish(planOf(packageInput()), [
                '@snailicid3/workspace',
            ])

            expect(entryFor(planned, '@snailicid3/workspace')).toMatchObject({
                channel: 'latest',
                decision: 'planned',
                registryUrl: 'https://registry.npmjs.org/',
            })
            expect(planned.authorization).toEqual({ state: 'authorized' })
        })

        it('plans several explicitly selected packages', () => {
            const plan = planOf(
                packageInput(),
                packageInput({ name: '@snailicid3/config', version: '0.3.0' }),
            )
            const planned = publish(
                plan,
                ['@snailicid3/workspace', '@snailicid3/config'],
                [
                    candidate(),
                    candidate({
                        artifact: {
                            integrity: INTEGRITY,
                            name: '@snailicid3/config',
                            tarball: 'releases/config-0.3.0.tgz',
                            version: '0.3.0',
                        },
                        name: '@snailicid3/config',
                    }),
                ],
            )

            expect(planned.summary.planned).toBe(2)
            expect(planned.authorization).toEqual({ state: 'authorized' })
        })

        it.each([
            ['registry missing', {}],
            [
                'changesets intent',
                {
                    intent: {
                        bump: 'minor' as const,
                        reason: 'Authored changeset',
                        source: 'changesets' as const,
                    },
                },
            ],
            [
                'pending version',
                {
                    versionState: {
                        intendedVersion: '0.3.0',
                        state: 'pending' as const,
                    },
                },
            ],
            ['a non-private manifest', { private: false }],
            ['version 0.0.0', { version: '0.0.0' }],
        ])('never selects a package from %s alone', (_label, overrides) => {
            const planned = publish(planOf(packageInput(overrides)), [])

            expect(entryFor(planned, '@snailicid3/workspace')?.decision).toBe(
                'not_selected',
            )
            expect(planned.summary.planned).toBe(0)
        })

        it('does not auto-select an unrelated work-in-progress package', () => {
            const plan = planOf(
                packageInput(),
                packageInput({ name: '@snailicid3/wip', version: '0.0.0' }),
            )
            const planned = publish(plan, ['@snailicid3/workspace'])

            expect(entryFor(planned, '@snailicid3/wip')?.decision).toBe(
                'not_selected',
            )
        })
    })

    describe('registry truth', () => {
        it('treats an existing exact version as already published', () => {
            const planned = publish(
                planOf(
                    packageInput({
                        registry: {
                            distTags: { latest: '0.2.0' },
                            registryUrl: 'https://registry.npmjs.org/',
                            state: 'exists',
                        },
                    }),
                ),
                ['@snailicid3/workspace'],
            )

            expect(entryFor(planned, '@snailicid3/workspace')?.decision).toBe(
                'already_published',
            )
            expect(planned.summary.planned).toBe(0)
        })

        it.each([
            'unknown_auth',
            'unknown_network',
            'unknown_registry',
        ] as const)('blocks mutation when the registry reports %s', (state) => {
            const planned = publish(
                planOf(
                    packageInput({
                        registry: {
                            distTags: {},
                            registryUrl:
                                state === 'unknown_registry'
                                    ? null
                                    : 'https://registry.npmjs.org/',
                            state,
                        },
                    }),
                ),
                ['@snailicid3/workspace'],
            )

            expect(entryFor(planned, '@snailicid3/workspace')).toMatchObject({
                decision: 'blocked_registry_unknown',
                registryState: state,
            })
            expect(planned.authorization).toMatchObject({
                state: 'withheld',
            })
        })

        it('never lets a dist-tag stand in for exact version existence', () => {
            const planned = publish(
                planOf(
                    packageInput({
                        registry: {
                            distTags: { latest: '0.2.0' },
                            registryUrl: 'https://registry.npmjs.org/',
                            state: 'missing',
                        },
                    }),
                ),
                ['@snailicid3/workspace'],
            )

            expect(entryFor(planned, '@snailicid3/workspace')?.decision).toBe(
                'planned',
            )
        })
    })

    describe('policy and privacy', () => {
        it('never publishes a private package', () => {
            const planned = publish(planOf(packageInput({ private: true })), [
                '@snailicid3/workspace',
            ])

            expect(entryFor(planned, '@snailicid3/workspace')?.decision).toBe(
                'blocked_private',
            )
        })

        it('blocks a held policy and says why', () => {
            const planned = publish(
                planOf(
                    packageInput({
                        policy: {
                            decision: 'held',
                            reason: 'Awaiting sign-off',
                        },
                    }),
                ),
                ['@snailicid3/workspace'],
            )

            expect(entryFor(planned, '@snailicid3/workspace')).toMatchObject({
                decision: 'blocked_policy_held',
                reason: 'Awaiting sign-off',
            })
        })
    })

    describe('Doctor evidence', () => {
        it('blocks an invalid artifact', () => {
            const planned = publish(
                planOf(packageInput()),
                ['@snailicid3/workspace'],
                [
                    candidate({
                        doctor: {
                            artifact: 'invalid',
                            closure: { edges: [], state: 'valid' },
                        },
                    }),
                ],
            )

            expect(entryFor(planned, '@snailicid3/workspace')?.decision).toBe(
                'blocked_artifact_invalid',
            )
        })

        it('keeps unknown artifact facts distinct from invalid ones', () => {
            const planned = publish(
                planOf(packageInput()),
                ['@snailicid3/workspace'],
                [
                    candidate({
                        doctor: {
                            artifact: 'unknown',
                            closure: { edges: [], state: 'valid' },
                        },
                    }),
                ],
            )

            expect(entryFor(planned, '@snailicid3/workspace')?.decision).toBe(
                'unknown_artifact_facts',
            )
            expect(planned.summary.unknown).toBe(1)
        })

        it('blocks when no candidate evidence was supplied at all', () => {
            const planned = publish(
                planOf(packageInput()),
                ['@snailicid3/workspace'],
                [],
            )

            expect(entryFor(planned, '@snailicid3/workspace')?.decision).toBe(
                'blocked_artifact_unavailable',
            )
        })

        it('refuses a candidate whose artifact names a different version', () => {
            const planned = publish(
                planOf(packageInput()),
                ['@snailicid3/workspace'],
                [
                    candidate({
                        artifact: {
                            integrity: INTEGRITY,
                            name: '@snailicid3/workspace',
                            tarball: 'releases/workspace-0.1.0.tgz',
                            version: '0.1.0',
                        },
                    }),
                ],
            )

            expect(entryFor(planned, '@snailicid3/workspace')?.decision).toBe(
                'blocked_artifact_unavailable',
            )
        })
    })

    describe('dependency closure', () => {
        it('blocks an unavailable dependency and names it', () => {
            const planned = publish(
                planOf(packageInput()),
                ['@snailicid3/workspace'],
                [
                    candidate({
                        doctor: {
                            artifact: 'valid',
                            closure: {
                                edges: [
                                    {
                                        name: '@snailicid3/config',
                                        range: '^0.3.0',
                                        resolution: 'unavailable',
                                    },
                                ],
                                state: 'blocked',
                            },
                        },
                    }),
                ],
            )

            expect(entryFor(planned, '@snailicid3/workspace')).toMatchObject({
                decision: 'blocked_dependency_closure',
                unresolved: ['@snailicid3/config'],
            })
        })

        it('keeps unknown closure distinct from blocked closure', () => {
            const planned = publish(
                planOf(packageInput()),
                ['@snailicid3/workspace'],
                [
                    candidate({
                        doctor: {
                            artifact: 'valid',
                            closure: { state: 'unknown' },
                        },
                    }),
                ],
            )

            expect(entryFor(planned, '@snailicid3/workspace')?.decision).toBe(
                'unknown_dependency_closure',
            )
        })

        it('treats a single unknown edge as unknown closure', () => {
            const planned = publish(
                planOf(packageInput()),
                ['@snailicid3/workspace'],
                [
                    candidate({
                        doctor: {
                            artifact: 'valid',
                            closure: {
                                edges: [
                                    {
                                        name: '@snailicid3/config',
                                        resolution: 'unknown',
                                    },
                                ],
                                state: 'valid',
                            },
                        },
                    }),
                ],
            )

            expect(entryFor(planned, '@snailicid3/workspace')?.decision).toBe(
                'unknown_dependency_closure',
            )
        })

        it('accepts a dependency already available at a compatible registry version', () => {
            const planned = publish(
                planOf(packageInput()),
                ['@snailicid3/workspace'],
                [
                    candidate({
                        doctor: {
                            artifact: 'valid',
                            closure: {
                                edges: [
                                    {
                                        name: '@snailicid3/config',
                                        range: '^0.3.0',
                                        resolution: 'available_in_registry',
                                        satisfiedBy: '0.3.0',
                                    },
                                ],
                                state: 'valid',
                            },
                        },
                    }),
                ],
            )

            expect(entryFor(planned, '@snailicid3/workspace')?.decision).toBe(
                'planned',
            )
        })

        it('accepts a dependency Doctor proves embedded and not exposed', () => {
            const planned = publish(
                planOf(packageInput()),
                ['@snailicid3/workspace'],
                [
                    candidate({
                        doctor: {
                            artifact: 'valid',
                            closure: {
                                edges: [
                                    {
                                        name: '@snailicid3/utils',
                                        resolution: 'embedded_not_exposed',
                                    },
                                ],
                                state: 'valid',
                            },
                        },
                    }),
                ],
            )

            expect(entryFor(planned, '@snailicid3/workspace')?.decision).toBe(
                'planned',
            )
        })

        it('accepts a dependency satisfied by cohort membership when it really is selected', () => {
            const plan = planOf(
                packageInput(),
                packageInput({ name: '@snailicid3/config', version: '0.3.0' }),
            )
            const planned = publish(
                plan,
                ['@snailicid3/workspace', '@snailicid3/config'],
                [
                    candidate({
                        doctor: {
                            artifact: 'valid',
                            closure: {
                                edges: [
                                    {
                                        name: '@snailicid3/config',
                                        range: '^0.3.0',
                                        resolution: 'included_in_cohort',
                                    },
                                ],
                                state: 'valid',
                            },
                        },
                    }),
                    candidate({
                        artifact: {
                            integrity: INTEGRITY,
                            name: '@snailicid3/config',
                            tarball: 'releases/config-0.3.0.tgz',
                            version: '0.3.0',
                        },
                        name: '@snailicid3/config',
                    }),
                ],
            )

            expect(entryFor(planned, '@snailicid3/workspace')).toMatchObject({
                decision: 'planned',
                requires: ['@snailicid3/config'],
            })
        })

        it('retains selected cohort requirements for execution ordering', () => {
            const plan = planOf(
                packageInput(),
                packageInput({ name: '@snailicid3/config', version: '0.3.0' }),
            )
            const planned = publish(
                plan,
                ['@snailicid3/workspace', '@snailicid3/config'],
                [
                    candidate({
                        doctor: {
                            artifact: 'valid',
                            closure: {
                                edges: [
                                    {
                                        name: '@snailicid3/config',
                                        range: '^0.3.0',
                                        resolution: 'included_in_cohort',
                                    },
                                ],
                                state: 'valid',
                            },
                        },
                    }),
                    candidate({
                        artifact: {
                            integrity: INTEGRITY,
                            name: '@snailicid3/config',
                            tarball: 'releases/config-0.3.0.tgz',
                            version: '0.3.0',
                        },
                        name: '@snailicid3/config',
                    }),
                ],
            )

            expect(entryFor(planned, '@snailicid3/config')).toMatchObject({
                decision: 'planned',
                requires: [],
            })
            expect(entryFor(planned, '@snailicid3/workspace')).toMatchObject({
                requires: ['@snailicid3/config'],
            })
        })

        it('never auto-selects a dependency the cohort is missing', () => {
            const plan = planOf(
                packageInput(),
                packageInput({ name: '@snailicid3/config', version: '0.3.0' }),
            )
            const planned = publish(
                plan,
                ['@snailicid3/workspace'],
                [
                    candidate({
                        doctor: {
                            artifact: 'valid',
                            closure: {
                                edges: [
                                    {
                                        name: '@snailicid3/config',
                                        range: '^0.3.0',
                                        resolution: 'included_in_cohort',
                                    },
                                ],
                                state: 'valid',
                            },
                        },
                    }),
                ],
            )

            expect(entryFor(planned, '@snailicid3/workspace')).toMatchObject({
                decision: 'blocked_closure_dependency_not_in_cohort',
                missing: ['@snailicid3/config'],
            })
            expect(entryFor(planned, '@snailicid3/config')?.decision).toBe(
                'not_selected',
            )
        })
    })

    describe('authorization', () => {
        it('withholds authorization when any selected package is unresolved', () => {
            const plan = planOf(
                packageInput(),
                packageInput({ name: '@snailicid3/config', version: '0.3.0' }),
            )
            const planned = publish(
                plan,
                ['@snailicid3/workspace', '@snailicid3/config'],
                [candidate()],
            )

            expect(planned.authorization).toMatchObject({ state: 'withheld' })
            expect(
                planned.authorization.state === 'withheld' &&
                    planned.authorization.reasons,
            ).toContain('unresolved_prerequisites')
        })

        it('names a selection entry the plan does not know', () => {
            const planned = publish(planOf(packageInput()), [
                '@snailicid3/workspace',
                '@snailicid3/ghost',
            ])

            expect(
                planned.authorization.state === 'withheld' &&
                    planned.authorization.reasons,
            ).toContain('unknown_selected_package')
        })

        it('stays authorized when a selected package is merely already published', () => {
            const plan = planOf(
                packageInput(),
                packageInput({
                    name: '@snailicid3/config',
                    registry: {
                        distTags: {},
                        registryUrl: 'https://registry.npmjs.org/',
                        state: 'exists',
                    },
                    version: '0.3.0',
                }),
            )
            const planned = publish(
                plan,
                ['@snailicid3/workspace', '@snailicid3/config'],
                [
                    candidate(),
                    candidate({
                        artifact: {
                            integrity: INTEGRITY,
                            name: '@snailicid3/config',
                            tarball: 'releases/config-0.3.0.tgz',
                            version: '0.3.0',
                        },
                        name: '@snailicid3/config',
                    }),
                ],
            )

            expect(planned.authorization).toEqual({ state: 'authorized' })
            expect(planned.summary.alreadyPublished).toBe(1)
        })
    })

    describe('boundaries', () => {
        it('mutates nothing and leaves the observed plan untouched', () => {
            const plan = planOf(packageInput())
            const before = JSON.stringify(plan)

            publish(plan, ['@snailicid3/workspace'])

            expect(JSON.stringify(plan)).toBe(before)
        })

        it('declares its own schema version, separate from the observation', () => {
            const plan = planOf(packageInput())
            const planned = publish(plan, ['@snailicid3/workspace'])

            expect(planned.schemaVersion).toBe(1)
            expect(planned.operation).toBe('publish')
            expect(plan.execution.operation).toBe('observe')
            expect(plan.schemaVersion).toBe(1)
        })

        it('requires an explicit channel rather than defaulting one', () => {
            expect(() =>
                createReleasePublishPlan({
                    candidates: [candidate()],
                    channel: '',
                    plan: planOf(packageInput()),
                    selection: ['@snailicid3/workspace'],
                }),
            ).toThrow()
        })

        it('carries the requested channel onto every planned package', () => {
            const planned = publish(
                planOf(packageInput()),
                ['@snailicid3/workspace'],
                [candidate()],
                'next',
            )

            expect(entryFor(planned, '@snailicid3/workspace')).toMatchObject({
                channel: 'next',
            })
        })

        it('rejects an artifact without a valid integrity digest', () => {
            expect(() =>
                publish(
                    planOf(packageInput()),
                    ['@snailicid3/workspace'],
                    [
                        candidate({
                            artifact: {
                                integrity: 'not-a-digest',
                                name: '@snailicid3/workspace',
                                tarball: 'releases/workspace-0.2.0.tgz',
                                version: '0.2.0',
                            },
                        }),
                    ],
                ),
            ).toThrow()
        })
    })

    describe('already-published channel reconciliation authorization', () => {
        const existingInput = (
            overrides: Partial<ReleasePackagePlanInput> = {},
        ): ReleasePackagePlanInput =>
            packageInput({
                registry: {
                    distTags: { latest: '0.2.0' },
                    registryUrl: 'https://registry.npmjs.org/',
                    state: 'exists',
                },
                ...overrides,
            })

        it('carries no artifact field on an already-published entry', () => {
            const planned = publish(planOf(existingInput()), [
                '@snailicid3/workspace',
            ])
            const entry = entryFor(planned, '@snailicid3/workspace')

            expect(entry?.decision).toBe('already_published')
            expect(Object.keys(entry ?? {})).not.toContain('artifact')
            expect(planned.authorization).toEqual({ state: 'authorized' })
        })

        it('blocks channel reconciliation when policy is held', () => {
            const planned = publish(
                planOf(
                    existingInput({
                        policy: {
                            decision: 'held',
                            reason: 'Awaiting sign-off',
                        },
                    }),
                ),
                ['@snailicid3/workspace'],
            )

            expect(entryFor(planned, '@snailicid3/workspace')).toMatchObject({
                decision: 'blocked_policy_held',
                reason: 'Awaiting sign-off',
            })
            expect(planned.authorization).toMatchObject({ state: 'withheld' })
        })

        it('blocks channel reconciliation when Doctor artifact evidence is invalid', () => {
            const planned = publish(
                planOf(existingInput()),
                ['@snailicid3/workspace'],
                [
                    candidate({
                        doctor: {
                            artifact: 'invalid',
                            closure: { edges: [], state: 'valid' },
                        },
                    }),
                ],
            )

            expect(entryFor(planned, '@snailicid3/workspace')?.decision).toBe(
                'blocked_artifact_invalid',
            )
            expect(planned.authorization).toMatchObject({ state: 'withheld' })
        })

        it('blocks channel reconciliation when no Doctor evidence is available', () => {
            const planned = publish(
                planOf(existingInput()),
                ['@snailicid3/workspace'],
                [],
            )

            expect(entryFor(planned, '@snailicid3/workspace')?.decision).toBe(
                'blocked_artifact_unavailable',
            )
            expect(planned.authorization).toMatchObject({ state: 'withheld' })
        })
    })
})
