import { describe, expect, it } from 'vitest'
import {
    readReleasePlanFixture,
    type ReleasePlanFixtureName,
} from './../../test-fixtures/release-plan.js'
import {
    createReleasePlan,
    type ReleasePlan,
    releasePlanSchema,
} from './release-plan.js'

/** Recompose a frozen document from its own recorded facts, dropping the fields the composer derives. */
const recompose = (plan: ReleasePlan): ReleasePlan =>
    createReleasePlan({
        execution: plan.execution,
        packages: plan.packages.map(
            ({ availableNextOperations, status, ...facts }) => facts,
        ),
    })

const parseFixture = (name: ReleasePlanFixtureName): ReleasePlan =>
    releasePlanSchema.parse(readReleasePlanFixture(name))

describe('release-plan characterization', () => {
    it.each<ReleasePlanFixtureName>([
        'pull-request-232',
        'pull-request-233',
        'pull-request-234',
    ])('parses and reproduces the frozen %s document', (name) => {
        const document = readReleasePlanFixture(name)
        const plan = releasePlanSchema.parse(document)

        expect(plan).toEqual(document)
        expect(recompose(plan)).toEqual(plan)
    })

    it('records the two missing #232 exact versions as held inventory', () => {
        const plan = parseFixture('pull-request-232')

        expect(plan.summary).toEqual({
            blocked: 0,
            eligible: 0,
            held: 2,
            packages: 12,
            private: 2,
            published: 8,
            unknown: 0,
        })
        expect(
            plan.packages
                .filter((packagePlan) => packagePlan.status === 'pending_held')
                .map((packagePlan) => packagePlan.name),
        ).toEqual(['@snailicid3/storybook-config', '@snailicid3/workspace'])
    })

    it('reports zero #233 candidates even while Changesets intent is pending', () => {
        const plan = parseFixture('pull-request-233')

        expect(plan.summary).toEqual({
            blocked: 0,
            eligible: 0,
            held: 0,
            packages: 12,
            private: 2,
            published: 10,
            unknown: 0,
        })
        expect(
            plan.packages.some(
                (packagePlan) => packagePlan.intent.source === 'changesets',
            ),
        ).toBe(true)
        expect(
            plan.packages.every(
                (packagePlan) => packagePlan.status !== 'pending_eligible',
            ),
        ).toBe(true)
    })

    it('does not authorize the nine missing #234 exact versions', () => {
        const plan = parseFixture('pull-request-234')

        expect(plan.summary).toEqual({
            blocked: 0,
            eligible: 0,
            held: 9,
            packages: 12,
            private: 2,
            published: 1,
            unknown: 0,
        })
        expect(
            plan.packages.filter(
                (packagePlan) => packagePlan.registry.state === 'missing',
            ),
        ).toHaveLength(9)
    })

    it.each<ReleasePlanFixtureName>([
        'pull-request-232',
        'pull-request-233',
        'pull-request-234',
    ])('never offers publish from %s observation alone', (name) => {
        const plan = parseFixture(name)

        expect(plan.execution.operation).toBe('observe')
        expect(
            plan.packages.some((packagePlan) =>
                packagePlan.availableNextOperations.includes('publish'),
            ),
        ).toBe(false)
    })

    it.each<ReleasePlanFixtureName>([
        'pull-request-232',
        'pull-request-233',
        'pull-request-234',
    ])(
        'keeps private packages unpublishable in %s despite no registry answer',
        (name) => {
            const privatePackages = parseFixture(name).packages.filter(
                (packagePlan) => packagePlan.private,
            )

            expect(privatePackages).toHaveLength(2)
            expect(
                privatePackages.every(
                    (packagePlan) =>
                        packagePlan.registry.state === 'unknown_registry' &&
                        packagePlan.status === 'private_unpublishable',
                ),
            ).toBe(true)
        },
    )
})
