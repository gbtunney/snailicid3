import { packageNameSchema, packageVersionSchema } from '@snailicid3/node-utils'
import { z } from 'zod'
import { releasePlanSchema } from './release-plan.js'

/**
 * Git tag planning, kept on its own axis.
 *
 * A Git tag marks a commit in this repository. An npm dist-tag is a moving pointer inside a registry, and npm
 * publication is a separate operation again. #206 keeps the three apart, so nothing here reads registry state: a
 * package absent from npm is as taggable as one already published, and a `latest` pointer has no bearing either way.
 *
 * This plans. It creates no tag, pushes nothing, and authorizes no publication.
 */

/**
 * The prerequisite the observation contract could not express on its own.
 *
 * `ReleaseVersionState` distinguishes `pending` — a bump intended but not yet written into the manifest — from
 * `current`. That is exactly the prerequisite tagging needs, read the right way round: a `pending` version does not
 * exist in the tree yet, so tagging it would point a tag at a commit that does not contain the version the tag names.
 * Preparation is what turns `pending` into `current`, so "preparation completed" needs no new canonical state; it is
 * `current` observed after the fact. What the observation genuinely cannot say is whether a tag already exists, and
 * that is a Git fact supplied to this planner rather than a property of the plan being read.
 */
const releaseTagNameSchema = z
    .string()
    .trim()
    .min(1)
    .regex(
        /^(?:@[^\s@/]+\/)?[^\s@/]+@\d+\.\d+\.\d+(?:[-+][0-9A-Za-z-.]+)*$/u,
        'Git tags are `name@version`',
    )

/** Why a tagging operation cannot proceed, or cannot proceed completely. */
export const releaseTagBlockerSchema = z.discriminatedUnion('reason', [
    z.strictObject({ reason: z.literal('no_selected_packages') }),
    z.strictObject({ reason: z.literal('no_taggable_packages') }),
    z.strictObject({
        names: z.array(z.string().min(1)).min(1),
        reason: z.literal('unknown_selected_package'),
    }),
    z.strictObject({ reason: z.literal('tag_inventory_unavailable') }),
])

/**
 * One package's place in a tagging operation.
 *
 * The discriminator carries the reason rather than pairing a `blocked` flag with a separate field, so a caller cannot
 * read "not planned" without also reading why. A version waiting on preparation, a version already tagged, and a tag
 * inventory nobody could read are three different situations needing three different responses, and none of them is the
 * absence of a request.
 */
export const releaseTagPackageSchema = z.discriminatedUnion('decision', [
    z.strictObject({
        decision: z.literal('planned'),
        name: packageNameSchema,
        private: z.boolean(),
        tag: releaseTagNameSchema,
        version: packageVersionSchema,
    }),
    z.strictObject({
        decision: z.literal('blocked_preparation_incomplete'),
        intendedVersion: packageVersionSchema,
        name: packageNameSchema,
        private: z.boolean(),
        version: packageVersionSchema,
    }),
    z.strictObject({
        decision: z.literal('blocked_already_tagged'),
        name: packageNameSchema,
        private: z.boolean(),
        tag: releaseTagNameSchema,
        version: packageVersionSchema,
    }),
    z.strictObject({
        decision: z.literal('unknown_tag_inventory'),
        name: packageNameSchema,
        private: z.boolean(),
        tag: releaseTagNameSchema,
        version: packageVersionSchema,
    }),
    z.strictObject({
        decision: z.literal('not_selected'),
        name: packageNameSchema,
        private: z.boolean(),
        version: packageVersionSchema,
    }),
])

export const releaseTagPlanSummarySchema = z.strictObject({
    blocked: z.number().int().nonnegative(),
    packages: z.number().int().nonnegative(),
    planned: z.number().int().nonnegative(),
    private: z.number().int().nonnegative(),
    selected: z.number().int().nonnegative(),
    unknown: z.number().int().nonnegative(),
})

/** The canonical tag document, versioned independently of the observation it reads. */
export const releaseTagPlanSchema = z.strictObject({
    blockers: z.array(releaseTagBlockerSchema),
    operation: z.literal('tag'),
    packages: z.array(releaseTagPackageSchema),
    schemaVersion: z.literal(1),
    summary: releaseTagPlanSummarySchema,
})

export const createReleaseTagPlanInputSchema = z.strictObject({
    existingTags: z.array(z.string()).nullable(),
    plan: releasePlanSchema,
    selection: z.array(packageNameSchema),
})

export type CreateReleaseTagPlanInput = z.input<
    typeof createReleaseTagPlanInputSchema
>
export type ReleaseTagBlocker = ReleaseTagPlan['blockers'][number]
export type ReleaseTagPackage = ReleaseTagPlan['packages'][number]
export type ReleaseTagPlan = z.infer<typeof releaseTagPlanSchema>
export type ReleaseTagPlanSummary = ReleaseTagPlan['summary']

/**
 * Plan Git tags over an observed release plan.
 *
 * Selection is explicit; a version being desirable never selects itself. A selected package is taggable only when its
 * version is already applied — a `pending` version is blocked as incomplete preparation rather than tagged on the
 * strength of intent, because the tag would otherwise name a version the tree does not contain.
 *
 * `existingTags` of `null` means the inventory could not be read. Every selected package is then `unknown` rather than
 * planned, because a tag that may already exist is not a tag that may safely be created, and it is not `blocked` either
 * — nothing was established.
 */
export function createReleaseTagPlan(
    input: CreateReleaseTagPlanInput,
): ReleaseTagPlan {
    const parsed = createReleaseTagPlanInputSchema.parse(input)
    const selection = new Set(parsed.selection)
    const known = new Set(
        parsed.plan.packages.map((packagePlan) => packagePlan.name),
    )
    const unknown = [...selection].filter((name) => !known.has(name)).toSorted()
    const existing =
        parsed.existingTags === null ? null : new Set(parsed.existingTags)

    const packages = parsed.plan.packages.map(
        (packagePlan): ReleaseTagPackage => {
            const shared = {
                name: packagePlan.name,
                private: packagePlan.private,
                version: packagePlan.version,
            }

            if (!selection.has(packagePlan.name)) {
                return { ...shared, decision: 'not_selected' }
            }

            if (packagePlan.versionState.state === 'pending') {
                return {
                    ...shared,
                    decision: 'blocked_preparation_incomplete',
                    intendedVersion: packagePlan.versionState.intendedVersion,
                }
            }

            const tag = formatReleaseTagName(
                packagePlan.name,
                packagePlan.version,
            )

            if (existing === null) {
                return { ...shared, decision: 'unknown_tag_inventory', tag }
            }

            return existing.has(tag)
                ? { ...shared, decision: 'blocked_already_tagged', tag }
                : { ...shared, decision: 'planned', tag }
        },
    )

    const planned = packages.filter((entry) => entry.decision === 'planned')

    return releaseTagPlanSchema.parse({
        blockers: deriveBlockers({
            inventoryUnavailable: existing === null,
            planned: planned.length,
            selected: selection.size,
            unknown,
        }),
        operation: 'tag',
        packages,
        schemaVersion: 1,
        summary: {
            blocked: packages.filter((entry) =>
                entry.decision.startsWith('blocked_'),
            ).length,
            packages: packages.length,
            planned: planned.length,
            private: planned.filter((entry) => entry.private).length,
            selected: selection.size,
            unknown: packages.filter((entry) =>
                entry.decision.startsWith('unknown_'),
            ).length,
        },
    })
}

/** The deterministic tag identity for one package version, matching every tag this repository already carries. */
export function formatReleaseTagName(name: string, version: string): string {
    return releaseTagNameSchema.parse(`${name}@${version}`)
}

function deriveBlockers(facts: {
    inventoryUnavailable: boolean
    planned: number
    selected: number
    unknown: ReadonlyArray<string>
}): Array<ReleaseTagBlocker> {
    const blockers: Array<ReleaseTagBlocker> = []

    if (facts.selected === 0) blockers.push({ reason: 'no_selected_packages' })
    else if (facts.planned === 0) {
        blockers.push({ reason: 'no_taggable_packages' })
    }

    if (facts.unknown.length > 0) {
        blockers.push({
            names: [...facts.unknown],
            reason: 'unknown_selected_package',
        })
    }

    if (facts.inventoryUnavailable) {
        blockers.push({ reason: 'tag_inventory_unavailable' })
    }

    return blockers
}
