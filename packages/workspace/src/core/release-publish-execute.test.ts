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
        integrity?: null | string
        observations?: Array<string>
        publishOk?: boolean
    } = {},
): { adapter: ReleasePublishAdapter; calls: Calls } => {
    const calls: Calls = []
    const observations = [...(behaviour.observations ?? ['missing', 'exists'])]

    return {
        adapter: {
            assignDistTag: (artifact, channel) => {
                calls.push(
                    `dist-tag:${artifact.name}@${artifact.version}:${channel}`,
                )

                return {
                    detail: behaviour.distTagOk === false ? 'tag refused' : '',
                    ok: behaviour.distTagOk !== false,
                }
            },
            observeExact: (artifact) => {
                const next = observations.shift() ?? 'exists'
                calls.push(
                    `observe:${artifact.name}@${artifact.version}:${next}`,
                )

                return next
            },
            publishTarball: (artifact) => {
                calls.push(`publish:${artifact.tarball}`)

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
                `publish:${TARBALL}`,
                'observe:@snailicid3/workspace@0.2.0:exists',
                'dist-tag:@snailicid3/workspace@0.2.0:latest',
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
                skipped: 0,
            })
        })

        it('sends the exact validated tarball to the adapter', () => {
            const { adapter, calls } = fakeAdapter()

            executePublishWithAdapter(authorizedPlan(), adapter)

            expect(calls).toContain(`publish:${TARBALL}`)
            expect(
                calls.some((call) => call.startsWith('publish:packages/')),
            ).toBe(false)
        })

        it('assigns the explicitly requested channel, never a default', () => {
            const { adapter, calls } = fakeAdapter()

            executePublishWithAdapter(authorizedPlan({}, 'next'), adapter)

            expect(calls).toContain('dist-tag:@snailicid3/workspace@0.2.0:next')
        })
    })

    describe('idempotency and resume', () => {
        it('skips a version the registry already has rather than republishing', () => {
            const { adapter, calls } = fakeAdapter({
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

            const retry = fakeAdapter({ observations: ['exists'] })
            const second = executePublishWithAdapter(plan, retry.adapter)

            expect(second.steps[0]?.outcome).toBe('skipped_already_published')
            expect(
                retry.calls.some((call) => call.startsWith('publish:')),
            ).toBe(false)
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

        it('leaves a dist-tag failure resumable, with the version already published', () => {
            const plan = authorizedPlan()
            const failed = fakeAdapter({ distTagOk: false })
            executePublishWithAdapter(plan, failed.adapter)

            const resumed = fakeAdapter({ observations: ['exists'] })
            const result = executePublishWithAdapter(plan, resumed.adapter)

            expect(result.steps[0]?.outcome).toBe('skipped_already_published')
            expect(
                resumed.calls.some((call) => call.startsWith('publish:')),
            ).toBe(false)
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
})
