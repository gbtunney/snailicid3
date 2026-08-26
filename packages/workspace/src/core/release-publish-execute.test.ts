import { describe, expect, it } from 'vitest'
import {
    createReleasePlan,
    type ReleasePackagePlanInput,
} from './release-plan.js'
import {
    executePublishWithAdapter,
    type ReleasePublishAdapter,
} from './release-publish-execute.js'
import {
    createReleasePublishPlan,
    type ReleasePublishCandidate,
    type ReleasePublishPlan,
} from './release-publish.js'

const INTEGRITY = `sha512-${'a'.repeat(86)}==`
const OTHER_INTEGRITY = `sha512-${'b'.repeat(86)}==`
const TARBALL = 'releases/snailicid3-workspace-0.2.0.tgz'

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
        tarball: TARBALL,
        version: '0.2.0',
    },
    doctor: { artifact: 'valid', closure: { edges: [], state: 'valid' } },
    name: '@snailicid3/workspace',
    ...overrides,
})

const authorizedPlan = (
    overrides: Partial<ReleasePackagePlanInput> = {},
    channel = 'latest',
): ReleasePublishPlan =>
    createReleasePublishPlan({
        candidates: [candidate()],
        channel,
        plan: createReleasePlan({ packages: [packageInput(overrides)] }),
        selection: ['@snailicid3/workspace'],
    })

type Calls = Array<string>

/**
 * A deterministic stand-in for npm.
 *
 * No test in this file touches a registry, a filesystem tarball or a Git tag. Every failure path this module encodes is
 * a failure a live registry will not produce on demand, which is the whole reason the adapter is injected.
 */
const fakeAdapter = (
    behaviour: {
        distTagOk?: boolean
        distTags?: Array<null | string>
        integrity?: null | string
        observations?: Array<string>
        publishOk?: boolean
    } = {},
): { adapter: ReleasePublishAdapter; calls: Calls } => {
    const calls: Calls = []
    const observations = [...(behaviour.observations ?? ['missing', 'exists'])]
    /**
     * The channel as the registry would report it across successive reads.
     *
     * `null` is an unassigned channel, `'unknown'` an unreadable one, and any other value the version the channel
     * points at. The default walks unassigned then correctly assigned, which is what a successful assignment looks like
     * from outside.
     */
    const distTags = [...(behaviour.distTags ?? [null, '0.2.0'])]

    return {
        adapter: {
            assignDistTag: (name, version, channel) => {
                calls.push(`dist-tag:${name}@${version}:${channel}`)

                return {
                    detail: behaviour.distTagOk === false ? 'tag refused' : '',
                    ok: behaviour.distTagOk !== false,
                }
            },
            observeDistTag: (name, version, channel) => {
                const next: null | string =
                    distTags.length > 0 ? (distTags.shift() ?? null) : version
                calls.push(`observe-tag:${channel}:${next ?? 'unassigned'}`)

                if (next === null) return { kind: 'unassigned' }
                if (next === 'unknown') return { kind: 'unknown' }

                return { kind: 'assigned', version: next }
            },
            observeExact: (name, version) => {
                const next = observations.shift() ?? 'exists'
                calls.push(`observe:${name}@${version}:${next}`)

                return next
            },
            publishTarball: (artifact, channel) => {
                calls.push(`publish:${artifact.tarball}:${channel}`)

                return {
                    detail: behaviour.publishOk === false ? 'refused' : '',
                    ok: behaviour.publishOk !== false,
                }
            },
            readIntegrity: (tarball) => {
                calls.push(`integrity:${tarball}`)

                return behaviour.integrity === undefined
                    ? INTEGRITY
                    : behaviour.integrity
            },
        },
        calls,
    }
}

describe('release publish execution', () => {
    describe('authorization gate', () => {
        it('never starts when the plan withheld authorization', () => {
            const plan = createReleasePublishPlan({
                candidates: [],
                channel: 'latest',
                plan: createReleasePlan({ packages: [packageInput()] }),
                selection: ['@snailicid3/workspace'],
            })
            const { adapter, calls } = fakeAdapter()
            const result = executePublishWithAdapter(plan, adapter)

            expect(plan.authorization.state).toBe('withheld')
            expect(result.started).toBe(false)
            expect(result.steps).toEqual([])
            expect(calls).toEqual([])
        })

        it('publishes nothing when no package was selected', () => {
            const plan = createReleasePublishPlan({
                candidates: [candidate()],
                channel: 'latest',
                plan: createReleasePlan({ packages: [packageInput()] }),
                selection: [],
            })
            const { adapter, calls } = fakeAdapter()

            expect(executePublishWithAdapter(plan, adapter).started).toBe(false)
            expect(calls).toEqual([])
        })
    })

    describe('happy path', () => {
        it('rechecks, publishes, verifies, then assigns the channel in that order', () => {
            const { adapter, calls } = fakeAdapter()
            const result = executePublishWithAdapter(authorizedPlan(), adapter)

            expect(calls).toEqual([
                'observe:@snailicid3/workspace@0.2.0:missing',
                `integrity:${TARBALL}`,
                `publish:${TARBALL}:latest`,
                'observe:@snailicid3/workspace@0.2.0:exists',
                'observe-tag:latest:unassigned',
                'dist-tag:@snailicid3/workspace@0.2.0:latest',
                'observe-tag:latest:0.2.0',
            ])
            expect(result.steps[0]).toEqual({
                channel: 'latest',
                name: '@snailicid3/workspace',
                outcome: 'published',
                version: '0.2.0',
            })
            expect(result.summary).toEqual({
                failed: 0,
                published: 1,
                resumed: 0,
                skipped: 0,
            })
        })

        it('sends the exact validated tarball to the adapter', () => {
            const { adapter, calls } = fakeAdapter()

            executePublishWithAdapter(authorizedPlan(), adapter)

            expect(calls).toContain(`publish:${TARBALL}:latest`)
            expect(
                calls.some((call) => call.startsWith('publish:packages/')),
            ).toBe(false)
        })

        it('assigns the explicitly requested channel, never a default', () => {
            const { adapter, calls } = fakeAdapter()

            executePublishWithAdapter(authorizedPlan({}, 'next'), adapter)

            expect(calls).toContain('dist-tag:@snailicid3/workspace@0.2.0:next')
        })

        it('publishes with the explicitly requested tag instead of npm defaulting to latest', () => {
            const { adapter, calls } = fakeAdapter()

            executePublishWithAdapter(authorizedPlan({}, 'next'), adapter)

            expect(calls).toContain(
                'publish:releases/snailicid3-workspace-0.2.0.tgz:next',
            )
            expect(calls).not.toContain(
                'publish:releases/snailicid3-workspace-0.2.0.tgz:latest',
            )
        })
    })

    describe('cohort dependency execution', () => {
        it('executes a required cohort dependency before its dependent even when input order is reversed', () => {
            const plan = createReleasePublishPlan({
                candidates: [
                    {
                        artifact: {
                            integrity: INTEGRITY,
                            name: '@snailicid3/app',
                            tarball: 'releases/app-1.0.0.tgz',
                            version: '1.0.0',
                        },
                        doctor: {
                            artifact: 'valid',
                            closure: {
                                edges: [
                                    {
                                        name: '@snailicid3/lib',
                                        range: '^2.0.0',
                                        resolution: 'included_in_cohort',
                                    },
                                ],
                                state: 'valid',
                            },
                        },
                        name: '@snailicid3/app',
                    },
                    {
                        artifact: {
                            integrity: INTEGRITY,
                            name: '@snailicid3/lib',
                            tarball: 'releases/lib-2.0.0.tgz',
                            version: '2.0.0',
                        },
                        doctor: {
                            artifact: 'valid',
                            closure: { edges: [], state: 'valid' },
                        },
                        name: '@snailicid3/lib',
                    },
                ],
                channel: 'latest',
                plan: createReleasePlan({
                    packages: [
                        packageInput({
                            name: '@snailicid3/app',
                            registry: {
                                distTags: {},
                                registryUrl: 'https://registry.npmjs.org/',
                                state: 'missing',
                            },
                            version: '1.0.0',
                        }),
                        packageInput({
                            name: '@snailicid3/lib',
                            registry: {
                                distTags: {},
                                registryUrl: 'https://registry.npmjs.org/',
                                state: 'missing',
                            },
                            version: '2.0.0',
                        }),
                    ],
                }),
                selection: ['@snailicid3/app', '@snailicid3/lib'],
            })
            const { adapter, calls } = fakeAdapter({
                distTags: [null, '2.0.0', null, '1.0.0'],
                observations: ['missing', 'exists', 'missing', 'exists'],
            })
            executePublishWithAdapter(plan, adapter)

            expect(
                calls.indexOf('publish:releases/lib-2.0.0.tgz:latest'),
            ).toBeLessThan(
                calls.indexOf('publish:releases/app-1.0.0.tgz:latest'),
            )
        })

        it('blocks a dependent when its required cohort dependency fails to publish', () => {
            const plan = createReleasePublishPlan({
                candidates: [
                    {
                        artifact: {
                            integrity: INTEGRITY,
                            name: '@snailicid3/app',
                            tarball: 'releases/app-1.0.0.tgz',
                            version: '1.0.0',
                        },
                        doctor: {
                            artifact: 'valid',
                            closure: {
                                edges: [
                                    {
                                        name: '@snailicid3/lib',
                                        range: '^2.0.0',
                                        resolution: 'included_in_cohort',
                                    },
                                ],
                                state: 'valid',
                            },
                        },
                        name: '@snailicid3/app',
                    },
                    {
                        artifact: {
                            integrity: INTEGRITY,
                            name: '@snailicid3/lib',
                            tarball: 'releases/lib-2.0.0.tgz',
                            version: '2.0.0',
                        },
                        doctor: {
                            artifact: 'valid',
                            closure: { edges: [], state: 'valid' },
                        },
                        name: '@snailicid3/lib',
                    },
                ],
                channel: 'latest',
                plan: createReleasePlan({
                    packages: [
                        packageInput({
                            name: '@snailicid3/app',
                            registry: {
                                distTags: {},
                                registryUrl: 'https://registry.npmjs.org/',
                                state: 'missing',
                            },
                            version: '1.0.0',
                        }),
                        packageInput({
                            name: '@snailicid3/lib',
                            registry: {
                                distTags: {},
                                registryUrl: 'https://registry.npmjs.org/',
                                state: 'missing',
                            },
                            version: '2.0.0',
                        }),
                    ],
                }),
                selection: ['@snailicid3/app', '@snailicid3/lib'],
            })
            const { adapter, calls } = fakeAdapter({ publishOk: false })
            const result = executePublishWithAdapter(plan, adapter)

            expect(
                result.steps.some(
                    (step) =>
                        step.name === '@snailicid3/lib' &&
                        step.outcome === 'failed_publish',
                ),
            ).toBe(true)
            expect(
                result.steps.some(
                    (step) =>
                        step.name === '@snailicid3/app' &&
                        step.outcome === 'blocked_dependency_unavailable',
                ),
            ).toBe(true)
            expect(
                calls.indexOf('publish:releases/lib-2.0.0.tgz:latest'),
            ).toBeGreaterThanOrEqual(0)
            expect(
                calls.includes('publish:releases/app-1.0.0.tgz:latest'),
            ).toBe(false)
        })

        it('allows a dependent to proceed when the required cohort dependency already exists at the needed version', () => {
            const plan = createReleasePublishPlan({
                candidates: [
                    {
                        artifact: {
                            integrity: INTEGRITY,
                            name: '@snailicid3/app',
                            tarball: 'releases/app-1.0.0.tgz',
                            version: '1.0.0',
                        },
                        doctor: {
                            artifact: 'valid',
                            closure: {
                                edges: [
                                    {
                                        name: '@snailicid3/lib',
                                        range: '^2.0.0',
                                        resolution: 'included_in_cohort',
                                    },
                                ],
                                state: 'valid',
                            },
                        },
                        name: '@snailicid3/app',
                    },
                    {
                        artifact: {
                            integrity: INTEGRITY,
                            name: '@snailicid3/lib',
                            tarball: 'releases/lib-2.0.0.tgz',
                            version: '2.0.0',
                        },
                        doctor: {
                            artifact: 'valid',
                            closure: { edges: [], state: 'valid' },
                        },
                        name: '@snailicid3/lib',
                    },
                ],
                channel: 'latest',
                plan: createReleasePlan({
                    packages: [
                        packageInput({
                            name: '@snailicid3/app',
                            registry: {
                                distTags: {},
                                registryUrl: 'https://registry.npmjs.org/',
                                state: 'missing',
                            },
                            version: '1.0.0',
                        }),
                        packageInput({
                            name: '@snailicid3/lib',
                            registry: {
                                distTags: { latest: '2.0.0' },
                                registryUrl: 'https://registry.npmjs.org/',
                                state: 'exists',
                            },
                            version: '2.0.0',
                        }),
                    ],
                }),
                selection: ['@snailicid3/app', '@snailicid3/lib'],
            })
            const { adapter } = fakeAdapter({
                distTags: ['2.0.0', '1.0.0'],
                observations: ['exists', 'missing', 'exists'],
            })
            const result = executePublishWithAdapter(plan, adapter)

            expect(
                result.steps.some(
                    (step) =>
                        step.name === '@snailicid3/lib' &&
                        step.outcome === 'skipped_already_published',
                ),
            ).toBe(true)
            expect(
                result.steps.some(
                    (step) =>
                        step.name === '@snailicid3/app' &&
                        step.outcome === 'published',
                ),
            ).toBe(true)
        })

        it('executes unrelated selected packages independently', () => {
            const plan = createReleasePublishPlan({
                candidates: [
                    candidate({
                        artifact: {
                            integrity: INTEGRITY,
                            name: '@snailicid3/workspace',
                            tarball: TARBALL,
                            version: '0.2.0',
                        },
                        name: '@snailicid3/workspace',
                    }),
                    {
                        artifact: {
                            integrity: INTEGRITY,
                            name: '@snailicid3/config',
                            tarball: 'releases/config-0.3.0.tgz',
                            version: '0.3.0',
                        },
                        doctor: {
                            artifact: 'valid',
                            closure: { edges: [], state: 'valid' },
                        },
                        name: '@snailicid3/config',
                    },
                ],
                channel: 'latest',
                plan: createReleasePlan({
                    packages: [
                        packageInput(),
                        packageInput({
                            name: '@snailicid3/config',
                            registry: {
                                distTags: {},
                                registryUrl: 'https://registry.npmjs.org/',
                                state: 'missing',
                            },
                            version: '0.3.0',
                        }),
                    ],
                }),
                selection: ['@snailicid3/workspace', '@snailicid3/config'],
            })
            const { adapter, calls } = fakeAdapter({
                distTags: [null, '0.2.0', null, '0.3.0'],
                observations: ['missing', 'exists', 'missing', 'exists'],
            })
            executePublishWithAdapter(plan, adapter)

            expect(
                calls.filter((call) => call.startsWith('publish:')),
            ).toHaveLength(2)
        })
    })

    describe('idempotency and resume', () => {
        it('skips a version the registry already has rather than republishing', () => {
            const { adapter, calls } = fakeAdapter({
                distTags: ['0.2.0'],
                observations: ['exists'],
            })
            const result = executePublishWithAdapter(authorizedPlan(), adapter)

            expect(result.steps[0]?.outcome).toBe('skipped_already_published')
            expect(calls.some((call) => call.startsWith('publish:'))).toBe(
                false,
            )
            expect(result.summary.published).toBe(0)
            expect(result.summary.skipped).toBe(1)
        })

        it('does not republish on a retry after the version landed', () => {
            const plan = authorizedPlan()
            const first = fakeAdapter()
            executePublishWithAdapter(plan, first.adapter)

            const retry = fakeAdapter({
                distTags: ['0.2.0'],
                observations: ['exists'],
            })
            const second = executePublishWithAdapter(plan, retry.adapter)

            expect(second.steps[0]?.outcome).toBe('skipped_already_published')
            expect(
                retry.calls.some((call) => call.startsWith('publish:')),
            ).toBe(false)
        })

        it('reconciles the requested channel on a fresh plan after the exact version already exists', () => {
            const plan = createReleasePublishPlan({
                candidates: [candidate()],
                channel: 'next',
                plan: createReleasePlan({
                    packages: [
                        packageInput({
                            registry: {
                                distTags: { latest: '0.2.0' },
                                registryUrl: 'https://registry.npmjs.org/',
                                state: 'exists',
                            },
                        }),
                    ],
                }),
                selection: ['@snailicid3/workspace'],
            })
            const { adapter, calls } = fakeAdapter({
                distTags: [null, '0.2.0'],
                observations: ['exists'],
            })
            const result = executePublishWithAdapter(plan, adapter)

            expect(result.steps[0]).toMatchObject({
                channel: 'next',
                name: '@snailicid3/workspace',
                outcome: 'assigned_dist_tag',
                version: '0.2.0',
            })
            expect(calls).toContain('dist-tag:@snailicid3/workspace@0.2.0:next')
            expect(calls.some((call) => call.startsWith('publish:'))).toBe(
                false,
            )
        })

        it.each(['unknown_auth', 'unknown_network', 'unknown_registry'])(
            'refuses to mutate when the pre-check reports %s',
            (observed) => {
                const { adapter, calls } = fakeAdapter({
                    observations: [observed],
                })
                const result = executePublishWithAdapter(
                    authorizedPlan(),
                    adapter,
                )

                expect(result.steps[0]).toMatchObject({
                    observed,
                    outcome: 'failed_registry_precheck',
                })
                expect(calls.some((call) => call.startsWith('publish:'))).toBe(
                    false,
                )
            },
        )
    })

    describe('artifact identity', () => {
        it('refuses a tarball whose bytes do not match the validated digest', () => {
            const { adapter, calls } = fakeAdapter({
                integrity: OTHER_INTEGRITY,
            })
            const result = executePublishWithAdapter(authorizedPlan(), adapter)

            expect(result.steps[0]).toMatchObject({
                expected: INTEGRITY,
                observed: OTHER_INTEGRITY,
                outcome: 'failed_artifact_integrity',
            })
            expect(calls.some((call) => call.startsWith('publish:'))).toBe(
                false,
            )
        })

        it('refuses when the artifact has no digest at all, as a directory would not', () => {
            const { adapter, calls } = fakeAdapter({ integrity: null })
            const result = executePublishWithAdapter(authorizedPlan(), adapter)

            expect(result.steps[0]).toMatchObject({
                observed: null,
                outcome: 'failed_artifact_integrity',
            })
            expect(calls.some((call) => call.startsWith('publish:'))).toBe(
                false,
            )
        })
    })

    describe('verification', () => {
        it('does not report success when the registry cannot confirm the version', () => {
            const { adapter } = fakeAdapter({
                observations: ['missing', 'missing'],
            })
            const result = executePublishWithAdapter(authorizedPlan(), adapter)

            expect(result.steps[0]).toMatchObject({
                observed: 'missing',
                outcome: 'failed_verification',
            })
            expect(result.summary.published).toBe(0)
            expect(result.summary.failed).toBe(1)
        })

        it('does not report success when verification could not answer', () => {
            const { adapter } = fakeAdapter({
                observations: ['missing', 'unknown_network'],
            })

            expect(
                executePublishWithAdapter(authorizedPlan(), adapter).steps[0],
            ).toMatchObject({
                observed: 'unknown_network',
                outcome: 'failed_verification',
            })
        })

        it('never assigns a channel to a version it could not verify', () => {
            const { adapter, calls } = fakeAdapter({
                observations: ['missing', 'missing'],
            })

            executePublishWithAdapter(authorizedPlan(), adapter)

            expect(calls.some((call) => call.startsWith('dist-tag:'))).toBe(
                false,
            )
        })

        it('reports a publish failure distinctly from a verification failure', () => {
            const { adapter, calls } = fakeAdapter({ publishOk: false })
            const result = executePublishWithAdapter(authorizedPlan(), adapter)

            expect(result.steps[0]).toMatchObject({
                detail: 'refused',
                outcome: 'failed_publish',
            })
            expect(
                calls.filter((call) => call.startsWith('observe:')),
            ).toHaveLength(1)
        })
    })

    describe('dist-tag as its own step', () => {
        it('keeps a dist-tag failure distinct from a publication failure', () => {
            const { adapter } = fakeAdapter({ distTagOk: false })
            const result = executePublishWithAdapter(authorizedPlan(), adapter)

            expect(result.steps[0]).toMatchObject({
                channel: 'latest',
                detail: 'tag refused',
                outcome: 'failed_dist_tag',
            })
            expect(result.summary.published).toBe(0)
        })

        /**
         * The regression this step exists for.
         *
         * An interrupted run whose publication succeeded but whose channel assignment failed must be completable. While
         * existence of the exact version ended the operation, a retry saw the version, skipped everything, and the
         * requested channel could never be assigned — the failure was permanent rather than resumable.
         */
        it('completes the channel on a retry after a dist-tag failure, without republishing', () => {
            const plan = authorizedPlan()
            const failed = fakeAdapter({ distTagOk: false, distTags: [null] })
            const first = executePublishWithAdapter(plan, failed.adapter)

            expect(first.steps[0]?.outcome).toBe('failed_dist_tag')
            expect(
                failed.calls.some((call) => call.startsWith('publish:')),
            ).toBe(true)

            const resumed = fakeAdapter({
                distTags: [null, '0.2.0'],
                observations: ['exists'],
            })
            const second = executePublishWithAdapter(plan, resumed.adapter)

            expect(second.steps[0]).toEqual({
                channel: 'latest',
                name: '@snailicid3/workspace',
                outcome: 'assigned_dist_tag',
                version: '0.2.0',
            })
            expect(
                resumed.calls.some((call) => call.startsWith('publish:')),
            ).toBe(false)
            expect(resumed.calls).toContain(
                'dist-tag:@snailicid3/workspace@0.2.0:latest',
            )
            expect(second.summary.resumed).toBe(1)
        })

        it('reassigns a channel pointing at a different version without republishing', () => {
            const { adapter, calls } = fakeAdapter({
                distTags: ['0.1.0', '0.2.0'],
                observations: ['exists'],
            })
            const result = executePublishWithAdapter(authorizedPlan(), adapter)

            expect(result.steps[0]?.outcome).toBe('assigned_dist_tag')
            expect(calls.some((call) => call.startsWith('publish:'))).toBe(
                false,
            )
        })

        it('does nothing when the version exists and the channel already points at it', () => {
            const { adapter, calls } = fakeAdapter({
                distTags: ['0.2.0'],
                observations: ['exists'],
            })
            const result = executePublishWithAdapter(authorizedPlan(), adapter)

            expect(result.steps[0]?.outcome).toBe('skipped_already_published')
            expect(calls.some((call) => call.startsWith('dist-tag:'))).toBe(
                false,
            )
        })

        it('refuses to assign a channel it could not read', () => {
            const { adapter, calls } = fakeAdapter({
                distTags: ['unknown'],
                observations: ['exists'],
            })
            const result = executePublishWithAdapter(authorizedPlan(), adapter)

            expect(result.steps[0]?.outcome).toBe('failed_dist_tag_unknown')
            expect(calls.some((call) => call.startsWith('dist-tag:'))).toBe(
                false,
            )
        })

        it('does not report a channel assigned that verification cannot confirm', () => {
            const { adapter } = fakeAdapter({
                distTags: [null, '0.1.0'],
                observations: ['exists'],
            })
            const result = executePublishWithAdapter(authorizedPlan(), adapter)

            expect(result.steps[0]).toMatchObject({
                observed: '0.1.0',
                outcome: 'failed_dist_tag_verification',
            })
        })

        it('never lets a dist-tag decide whether the exact version exists', () => {
            const { adapter, calls } = fakeAdapter()

            executePublishWithAdapter(
                authorizedPlan({
                    registry: {
                        distTags: { latest: '9.9.9' },
                        registryUrl: 'https://registry.npmjs.org/',
                        state: 'missing',
                    },
                }),
                adapter,
            )

            expect(calls).toContain(
                'observe:@snailicid3/workspace@0.2.0:missing',
            )
            expect(JSON.stringify(calls)).not.toContain('9.9.9')
        })
    })

    describe('boundaries', () => {
        it('never touches Git', () => {
            const { adapter, calls } = fakeAdapter()

            executePublishWithAdapter(authorizedPlan(), adapter)

            expect(JSON.stringify(calls)).not.toContain('tag:refs')
            expect(calls.some((call) => call.startsWith('git'))).toBe(false)
        })

        it('declares its own schema version', () => {
            const { adapter } = fakeAdapter()
            const result = executePublishWithAdapter(authorizedPlan(), adapter)

            expect(result.schemaVersion).toBe(1)
            expect(result.operation).toBe('publish')
        })

        it('planning alone performs no adapter call', () => {
            const { calls } = fakeAdapter()

            authorizedPlan()

            expect(calls).toEqual([])
        })
    })

    describe('fresh-plan channel reconciliation (already_published path)', () => {
        /** A plan where the exact version is already in the registry — no tarball or integrity needed. */
        const reconcilePlan = (
            channel = 'latest',
            candidateOverrides: Partial<ReleasePublishCandidate> = {},
        ): ReleasePublishPlan =>
            createReleasePublishPlan({
                candidates: [candidate(candidateOverrides)],
                channel,
                plan: createReleasePlan({
                    packages: [
                        packageInput({
                            registry: {
                                distTags: {},
                                registryUrl: 'https://registry.npmjs.org/',
                                state: 'exists',
                            },
                        }),
                    ],
                }),
                selection: ['@snailicid3/workspace'],
            })

        it('reconciles a channel without any artifact data in the plan entry', () => {
            const plan = reconcilePlan('next')
            const entry = plan.packages.find(
                (p) => p.name === '@snailicid3/workspace',
            )

            expect(entry?.decision).toBe('already_published')
            expect(Object.keys(entry ?? {})).not.toContain('artifact')
        })

        it('assigns the channel and reports assigned_dist_tag without publishing', () => {
            const { adapter, calls } = fakeAdapter({
                distTags: [null, '0.2.0'],
                observations: ['exists'],
            })
            const result = executePublishWithAdapter(
                reconcilePlan('next'),
                adapter,
            )

            expect(result.steps[0]).toMatchObject({
                channel: 'next',
                outcome: 'assigned_dist_tag',
            })
            expect(calls.some((call) => call.startsWith('publish:'))).toBe(
                false,
            )
            expect(calls).toContain('dist-tag:@snailicid3/workspace@0.2.0:next')
        })

        it.each([
            'missing',
            'unknown_auth',
            'unknown_network',
            'unknown_registry',
        ])(
            'refuses to mutate the channel when fresh exact observation reports %s',
            (observed) => {
                const { adapter, calls } = fakeAdapter({
                    observations: [observed],
                })
                const result = executePublishWithAdapter(
                    reconcilePlan(),
                    adapter,
                )

                expect(result.steps[0]).toMatchObject({
                    observed,
                    outcome: 'failed_registry_precheck',
                })
                expect(calls.some((call) => call.startsWith('dist-tag:'))).toBe(
                    false,
                )
            },
        )

        it('permits channel reconciliation when fresh exact observation reports exists', () => {
            const { adapter } = fakeAdapter({
                distTags: ['0.2.0'],
                observations: ['exists'],
            })
            const result = executePublishWithAdapter(reconcilePlan(), adapter)

            expect(result.steps[0]?.outcome).toBe('skipped_already_published')
        })
    })
})
