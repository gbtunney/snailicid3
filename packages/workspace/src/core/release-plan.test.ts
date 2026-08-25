import { describe, expect, it } from 'vitest'
import {
    createReleasePackagePlan,
    createReleasePlan,
    type ReleasePackagePlanInput,
    releasePlanSchema,
    releaseRegistryObservationSchema,
    type ReleaseRegistryState,
} from './release-plan.js'

const packageInput = (
    overrides: Partial<ReleasePackagePlanInput> = {},
): ReleasePackagePlanInput => ({
    access: 'public',
    doctor: { artifact: 'valid', dependencyClosure: 'valid' },
    gitTag: { selected: false },
    intent: { source: 'none' },
    name: '@snailicid3/workspace',
    policy: { decision: 'held', reason: 'Not selected' },
    private: false,
    registry: {
        distTags: { latest: '0.0.9' },
        registryUrl: 'https://registry.npmjs.org/',
        state: 'missing',
    },
    version: '0.1.0',
    versionState: { state: 'current' },
    ...overrides,
})

describe('release plan composition', () => {
    it('requires explicit selection before a missing version is eligible', () => {
        expect(createReleasePackagePlan(packageInput()).status).toBe(
            'pending_held',
        )

        const selected = createReleasePackagePlan(
            packageInput({
                policy: {
                    channel: 'next',
                    decision: 'selected',
                    reason: 'Explicit release operation',
                },
            }),
        )

        expect(selected.status).toBe('pending_eligible')
        expect(selected.availableNextOperations).toContain('publish')
    })

    it('keeps exact version existence separate from dist-tags', () => {
        const missing = createReleasePackagePlan(
            packageInput({
                registry: {
                    distTags: { latest: '0.0.9', next: '0.2.0-beta.1' },
                    registryUrl: 'https://registry.npmjs.org/',
                    state: 'missing',
                },
            }),
        )

        expect(missing.registry.distTags.latest).not.toBe(missing.version)
        expect(missing.status).toBe('pending_held')

        const supersededButPublished = createReleasePackagePlan(
            packageInput({
                registry: {
                    distTags: { latest: '0.2.0' },
                    registryUrl: 'https://registry.npmjs.org/',
                    state: 'exists',
                },
            }),
        )

        expect(supersededButPublished.registry.distTags.latest).not.toBe(
            supersededButPublished.version,
        )
        expect(supersededButPublished.status).toBe('published')
    })

    it.each<ReleaseRegistryState>([
        'unknown_auth',
        'unknown_network',
        'unknown_registry',
    ])('preserves %s as unknown registry state', (state) => {
        const packagePlan = createReleasePackagePlan(
            packageInput({
                registry: {
                    distTags: {},
                    registryUrl: 'https://registry.example.test/',
                    state,
                },
            }),
        )

        expect(packagePlan.registry.state).toBe(state)
        expect(packagePlan.status).toBe('unknown_registry')
        expect(packagePlan.availableNextOperations).not.toContain('publish')
    })

    it('rejects registry URLs containing credentials', () => {
        expect(() =>
            releaseRegistryObservationSchema.parse({
                distTags: {},
                registryUrl: 'https://token@example.test/',
                state: 'exists',
            }),
        ).toThrow(/credentials/u)
    })

    it('validates package identity at the model boundary', () => {
        expect(() =>
            createReleasePackagePlan(
                packageInput({ name: 'not a package name' }),
            ),
        ).toThrow()
        expect(() =>
            createReleasePackagePlan(packageInput({ version: 'next' })),
        ).toThrow()
    })

    it.each([
        [
            { artifact: 'invalid', dependencyClosure: 'valid' },
            'blocked_invalid_artifact',
        ],
        [
            { artifact: 'unknown', dependencyClosure: 'valid' },
            'blocked_unknown_artifact',
        ],
        [
            { artifact: 'valid', dependencyClosure: 'blocked' },
            'blocked_dependency_closure',
        ],
        [
            { artifact: 'valid', dependencyClosure: 'unknown' },
            'blocked_unknown_dependency_closure',
        ],
    ] as const)('maps Doctor facts to %s', (doctor, expectedStatus) => {
        const packagePlan = createReleasePackagePlan(
            packageInput({
                doctor,
                policy: {
                    channel: 'latest',
                    decision: 'selected',
                    reason: 'Explicit release operation',
                },
            }),
        )

        expect(packagePlan.status).toBe(expectedStatus)
        expect(packagePlan.availableNextOperations).not.toContain('publish')
    })

    it('keeps private publication and Git tag intent independent', () => {
        const packagePlan = createReleasePackagePlan(
            packageInput({
                gitTag: { name: '@snailicid3/private@0.1.0', selected: true },
                name: '@snailicid3/private',
                private: true,
                versionState: {
                    intendedVersion: '0.2.0',
                    state: 'pending',
                },
            }),
        )

        expect(packagePlan.status).toBe('private_unpublishable')
        expect(packagePlan.availableNextOperations).toEqual([
            'observe',
            'prepare',
            'tag',
        ])
        expect(packagePlan.availableNextOperations).not.toContain('publish')
    })

    it.each<ReleaseRegistryState>([
        'exists',
        'missing',
        'unknown_auth',
        'unknown_network',
        'unknown_registry',
    ])(
        'resolves a private package to private_unpublishable over %s',
        (state) => {
            const packagePlan = createReleasePackagePlan(
                packageInput({
                    name: '@snailicid3/private',
                    policy: {
                        channel: 'latest',
                        decision: 'selected',
                        reason: 'Explicit release operation',
                    },
                    private: true,
                    registry: {
                        distTags: {},
                        registryUrl: 'https://registry.npmjs.org/',
                        state,
                    },
                }),
            )

            expect(packagePlan.status).toBe('private_unpublishable')
            expect(packagePlan.availableNextOperations).not.toContain('publish')
        },
    )

    it('validates the intended version with the shared version schema', () => {
        expect(() =>
            createReleasePackagePlan(
                packageInput({
                    versionState: {
                        intendedVersion: 'next',
                        state: 'pending',
                    },
                }),
            ),
        ).toThrow(/semver/u)

        expect(
            createReleasePackagePlan(
                packageInput({
                    versionState: {
                        intendedVersion: '0.2.0-beta.1',
                        state: 'pending',
                    },
                }),
            ).availableNextOperations,
        ).toContain('prepare')
    })

    it('derives deterministic summaries and operation order', () => {
        const input = {
            packages: [
                packageInput(),
                packageInput({
                    gitTag: {
                        name: '@snailicid3/selected@0.2.0',
                        selected: true,
                    },
                    name: '@snailicid3/selected',
                    policy: {
                        channel: 'latest',
                        decision: 'selected' as const,
                        reason: 'Explicit release operation',
                    },
                    versionState: {
                        intendedVersion: '0.2.0',
                        state: 'pending' as const,
                    },
                }),
            ],
        }

        const first = createReleasePlan(input)
        const second = createReleasePlan(input)

        expect(first).toEqual(second)
        expect(first.packages[1]?.availableNextOperations).toEqual([
            'observe',
            'prepare',
            'tag',
            'publish',
        ])
        expect(first.summary).toEqual({
            blocked: 0,
            eligible: 1,
            held: 1,
            packages: 2,
            private: 0,
            published: 0,
            unknown: 0,
        })
    })

    it('rejects unsupported schema versions before reading fields', () => {
        const plan = createReleasePlan({ packages: [] })

        expect(() =>
            releasePlanSchema.parse({ ...plan, schemaVersion: 2 }),
        ).toThrow()
    })

    it('accepts only observe execution in this foundation', () => {
        expect(() =>
            createReleasePlan({
                execution: { operation: 'publish' } as never,
                packages: [],
            }),
        ).toThrow()
    })
})
