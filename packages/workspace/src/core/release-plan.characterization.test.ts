import { describe, expect, it } from 'vitest'
import {
    pullRequest232ReleasePlanFixture,
    pullRequest233ReleasePlanFixture,
    pullRequest234ReleasePlanFixture,
} from './../../test-fixtures/release-plan.js'
import { releasePlanSchema } from './release-plan.js'

describe('release-plan characterization', () => {
    it('records the two missing #232 versions as held inventory', () => {
        expect(
            releasePlanSchema.parse(pullRequest232ReleasePlanFixture),
        ).toEqual(pullRequest232ReleasePlanFixture)
        expect(pullRequest232ReleasePlanFixture.summary).toEqual({
            blocked: 0,
            eligible: 0,
            held: 2,
            packages: 9,
            private: 0,
            published: 7,
            unknown: 0,
        })
    })

    it('records the nine #233 exact versions as published', () => {
        expect(pullRequest233ReleasePlanFixture.summary).toEqual({
            blocked: 0,
            eligible: 0,
            held: 0,
            packages: 9,
            private: 0,
            published: 9,
            unknown: 0,
        })
    })

    it('does not authorize the nine missing #234 exact versions', () => {
        expect(pullRequest234ReleasePlanFixture.summary).toEqual({
            blocked: 0,
            eligible: 0,
            held: 9,
            packages: 9,
            private: 0,
            published: 0,
            unknown: 0,
        })
        expect(
            pullRequest234ReleasePlanFixture.packages.every(
                (packagePlan) =>
                    packagePlan.status === 'pending_held' &&
                    !packagePlan.availableNextOperations.includes('publish'),
            ),
        ).toBe(true)
    })
})
