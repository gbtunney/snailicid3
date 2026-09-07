import { describe, expect, it } from 'vitest'
import {
    createReleasePlan,
    type CreateReleasePlanInput,
    createReleasePreparePlan,
    createReleasePublishPlan,
    createReleaseTagPlan,
    executeReleasePublishPlan,
    releasePlanSchema,
    releasePreparePlanSchema,
    type ReleasePublishCandidate,
    releasePublishPlanSchema,
    releasePublishResultSchema,
    releaseTagPlanSchema,
} from './index.js'

/**
 * The release contract, exercised the way an external adapter reaches it.
 *
 * Every import above comes from the package root rather than from `core/release-*.js`, and that is the point of the
 * file. The rest of the release tests import their module directly, so they keep passing even if a name stops being
 * re-exported — which would break `snailicid3-actions#25` without breaking a single test here. Routing through the
 * barrel makes the export list itself the thing under test: dropping any name below fails this file first.
 *
 * What each document has to satisfy is fixed across all five, so the suite is table-driven rather than written out per
 * document. An adapter reads them the same way, so a difference between them is a defect rather than a variation.
 */

/** A dependency Doctor is expected to prove, kept valid so the artifact is never the reason a case fails. */
const INTEGRITY = `sha512-${'a'.repeat(86)}==`

/** One externally consumed document, paired with the schema an adapter validates it against. */
type ContractDocument = Readonly<{
    document: Record<string, unknown>
    name: string
    schema: {
        safeParse: (value: unknown) => { success: boolean }
    }
}>

type ReleasePackagePlanInput = CreateReleasePlanInput['packages'][number]

const packageInput = (
    overrides: Partial<ReleasePackagePlanInput> = {},
): ReleasePackagePlanInput => ({
    doctor: { artifact: 'valid', dependencyClosure: 'valid' },
    gitTag: { name: '@snailicid3/workspace@0.2.0', selected: true },
    intent: {
        bump: 'minor',
        reason: 'Authored changeset',
        source: 'changesets',
    },
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

const candidate = (): ReleasePublishCandidate => ({
    artifact: {
        integrity: INTEGRITY,
        name: '@snailicid3/workspace',
        tarball: 'releases/snailicid3-workspace-0.2.0.tgz',
        version: '0.2.0',
    },
    doctor: { artifact: 'valid', closure: { edges: [], state: 'valid' } },
    name: '@snailicid3/workspace',
})

/** Every document `snailicid3-actions#25` is expected to receive, built only from the public entry points. */
function buildContractDocuments(): ReadonlyArray<ContractDocument> {
    const selection = ['@snailicid3/workspace']
    const plan = createReleasePlan({ packages: [packageInput()] })
    const publishPlan = createReleasePublishPlan({
        candidates: [candidate()],
        channel: 'latest',
        plan,
        selection,
    })

    return [
        { document: plan, name: 'releasePlan', schema: releasePlanSchema },
        {
            document: createReleasePreparePlan({
                baseBranch: 'main',
                plan,
                selection,
                slug: 'whole-banks-swim',
                workingTree: 'clean',
            }),
            name: 'releasePreparePlan',
            schema: releasePreparePlanSchema,
        },
        {
            document: createReleaseTagPlan({
                existingTags: [],
                plan,
                preparedVersions: plan.packages.map((entry) => ({
                    name: entry.name,
                    version: entry.version,
                })),
                selection,
            }),
            name: 'releaseTagPlan',
            schema: releaseTagPlanSchema,
        },
        {
            document: publishPlan,
            name: 'releasePublishPlan',
            schema: releasePublishPlanSchema,
        },
        {
            document: unauthorizedPublishResult(),
            name: 'releasePublishResult',
            schema: releasePublishResultSchema,
        },
    ]
}

/**
 * A publish result obtained without publishing anything.
 *
 * `executeReleasePublishPlan` returns before it reaches its npm adapter when the plan is not authorized, so a plan
 * holding every package yields the real result document through the real public entry point while leaving the registry
 * and the working tree untouched. Reaching for the internal adapter seam instead would prove the seam works and say
 * nothing about the surface an adapter actually calls.
 */
function unauthorizedPublishResult(): Record<string, unknown> {
    const held = createReleasePlan({
        packages: [
            packageInput({
                policy: {
                    decision: 'held',
                    reason: 'No publish operation selected',
                },
            }),
        ],
    })

    return executeReleasePublishPlan(
        createReleasePublishPlan({
            candidates: [candidate()],
            channel: 'latest',
            plan: held,
            selection: [],
        }),
    )
}

const contractDocuments = buildContractDocuments()

describe('release contract, through the public package API', () => {
    it('exposes every document snailicid3-actions#25 needs from the package root', () => {
        expect(contractDocuments.map(({ name }) => name)).toEqual([
            'releasePlan',
            'releasePreparePlan',
            'releaseTagPlan',
            'releasePublishPlan',
            'releasePublishResult',
        ])
    })

    describe.each(contractDocuments)('$name', ({ document, schema }) => {
        it('declares schemaVersion 1 and validates against its own schema', () => {
            expect(document['schemaVersion']).toBe(1)
            expect(schema.safeParse(document).success).toBe(true)
        })

        it('rejects an unsupported schemaVersion without throwing', () => {
            // An adapter reads a version it does not support as a refusal, not as an exception to catch.
            const result = schema.safeParse({
                ...document,
                schemaVersion: 2,
            })

            expect(result.success).toBe(false)
        })

        it('rejects a document with no schemaVersion at all', () => {
            const { schemaVersion: _omitted, ...withoutVersion } = document

            expect(schema.safeParse(withoutVersion).success).toBe(false)
        })

        it('rejects values that are not documents', () => {
            for (const value of [null, undefined, 'plan', 42, []]) {
                expect(schema.safeParse(value).success).toBe(false)
            }
        })

        it('rejects an unknown top-level field', () => {
            // Strict objects are what stop an adapter reading a field this package never promised.
            expect(
                schema.safeParse({ ...document, publishNow: true }).success,
            ).toBe(false)
        })

        it('survives JSON serialization without changing shape', () => {
            // The adapter receives these as text through a workflow boundary, so the round trip is the real contract.
            const roundTripped: unknown = JSON.parse(JSON.stringify(document))

            expect(roundTripped).toStrictEqual(document)
            expect(schema.safeParse(roundTripped).success).toBe(true)
        })

        it('serializes deterministically', () => {
            expect(JSON.stringify(document)).toBe(JSON.stringify(document))
        })
    })

    it('refuses a document whose required field carries the wrong type', () => {
        const plan = createReleasePlan({ packages: [packageInput()] })

        expect(
            releasePlanSchema.safeParse({ ...plan, packages: 'none' }).success,
        ).toBe(false)
        expect(
            releasePlanSchema.safeParse({ ...plan, summary: null }).success,
        ).toBe(false)
    })

    it('does not publish when it returns a result for an unauthorized plan', () => {
        const result = unauthorizedPublishResult()

        // `started: false` with no steps is the evidence that nothing was attempted, not merely that nothing succeeded.
        expect(result['started']).toBe(false)
        expect(result['steps']).toEqual([])
        expect(result['summary']).toEqual({
            blocked: 0,
            failed: 0,
            published: 0,
            resumed: 0,
            skipped: 0,
        })
    })
})
