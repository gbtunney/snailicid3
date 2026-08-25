import { packageNameSchema, packageVersionSchema } from '@snailicid3/node-utils'
import { z } from 'zod'
import {
    createPullRequestPlan,
    type PullRequestPlan,
    pullRequestPlanSchema,
} from './pull-request-plan.js'
import { releasePlanSchema } from './release-plan.js'
import { formatScopes, shortenScopeName } from './scopes.js'

/**
 * Prepare planning: which packages a version operation would cover, and what it would produce.
 *
 * Prepare is its own document rather than a widening of `ReleasePlan.execution`. The observation contract is one stable
 * shape whose every field is present for every document, and prepare needs things observation has no place for — an
 * explicit selection, a branch identity, a pull request. Folding them in would make `releasePlanSchema` a union whose
 * shape depends on its execution, and would force a schema version on the observation contract every time a later
 * operation lands. So `ReleasePlan` stays the thing prepare reads, and prepare answers a different question about it.
 *
 * This plans. It runs no `changeset version`, consumes no changeset file, edits no manifest or changelog, creates no
 * branch, pushes nothing, opens no pull request, and authorizes no publication. Planning a preparation says nothing
 * about whether anything may ever be published.
 */

/** `release/<slug>`, matching the branch prefix the workflow model already recognizes. */
const RELEASE_BRANCH_PREFIX = 'release'

const releaseSlugSchema = z
    .string()
    .trim()
    .min(1)
    .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/u,
        'Release slugs are lowercase words joined by single hyphens',
    )

/**
 * Proof that one exact `name@version` was produced by a completed preparation.
 *
 * Preparation is what mints a version; this is the record that it did. Tagging consumes it because no state on the
 * observed plan can stand in for it: `versionState: 'current'` describes a package whose manifest version is simply
 * what it is, which is equally true of a version a preparation just wrote and of one that has sat unchanged for a year
 * with no intent behind it. Tagging on `current` alone would let an ordinary untouched package acquire a brand-new tag
 * pointing at whatever commit happened to be checked out, which is a claim about history that nothing established.
 *
 * The evidence is keyed by exact name and version so that a record for a different version cannot be read as a record
 * for this one.
 */
export const releasePreparationEvidenceSchema = z.strictObject({
    name: packageNameSchema,
    version: packageVersionSchema,
})

export type ReleasePreparationEvidence = z.infer<
    typeof releasePreparationEvidenceSchema
>

/**
 * Why a preparation cannot proceed, or cannot proceed completely.
 *
 * A reason rather than a flag: a caller that only learns preparation is unavailable cannot tell a dirty working tree
 * from a selection naming packages that no longer exist, and those need different responses.
 */
export const releasePrepareBlockerSchema = z.discriminatedUnion('reason', [
    z.strictObject({ reason: z.literal('no_selected_packages') }),
    z.strictObject({ reason: z.literal('no_preparable_packages') }),
    z.strictObject({
        names: z.array(z.string().min(1)).min(1),
        reason: z.literal('unknown_selected_package'),
    }),
    z.strictObject({ reason: z.literal('working_tree_dirty') }),
    z.strictObject({ reason: z.literal('working_tree_unknown') }),
])

/**
 * One package's place in a preparation.
 *
 * `not_selected` is kept distinct from `blocked`: a package nobody asked to prepare is not a package that failed to
 * prepare, and collapsing them would make an unselected package look like a problem.
 */
export const releasePreparePackageSchema = z.discriminatedUnion('decision', [
    z.strictObject({
        decision: z.literal('planned'),
        intendedVersion: packageVersionSchema,
        name: packageNameSchema,
        private: z.boolean(),
        version: packageVersionSchema,
    }),
    z.strictObject({
        decision: z.literal('blocked'),
        name: packageNameSchema,
        private: z.boolean(),
        reason: z.literal('no_pending_version'),
        version: packageVersionSchema,
    }),
    z.strictObject({
        decision: z.literal('not_selected'),
        name: packageNameSchema,
        private: z.boolean(),
        version: packageVersionSchema,
    }),
])

export const releasePreparePlanSummarySchema = z.strictObject({
    blocked: z.number().int().nonnegative(),
    packages: z.number().int().nonnegative(),
    planned: z.number().int().nonnegative(),
    private: z.number().int().nonnegative(),
    selected: z.number().int().nonnegative(),
})

/**
 * The canonical prepare document.
 *
 * `schemaVersion` is its own, starting at 1. It versions this contract, not the observation contract prepare reads —
 * the two move independently, which is the point of keeping them separate documents.
 */
export const releasePreparePlanSchema = z.strictObject({
    blockers: z.array(releasePrepareBlockerSchema),
    branch: z.string().min(1),
    operation: z.literal('prepare'),
    packages: z.array(releasePreparePackageSchema),
    pullRequest: pullRequestPlanSchema.nullable(),
    schemaVersion: z.literal(1),
    summary: releasePreparePlanSummarySchema,
})

export const createReleasePreparePlanInputSchema = z.strictObject({
    baseBranch: z.string().trim().min(1),
    plan: releasePlanSchema,
    selection: z.array(packageNameSchema),
    slug: releaseSlugSchema,
    workingTree: z.enum(['clean', 'dirty', 'unknown']).optional(),
})

export type CreateReleasePreparePlanInput = z.input<
    typeof createReleasePreparePlanInputSchema
>
export type ReleasePrepareBlocker = ReleasePreparePlan['blockers'][number]
export type ReleasePreparePackage = ReleasePreparePlan['packages'][number]
export type ReleasePreparePlan = z.infer<typeof releasePreparePlanSchema>
export type ReleasePreparePlanSummary = ReleasePreparePlan['summary']

/**
 * Plan a preparation over an observed release plan.
 *
 * The cohort is the intersection of what the caller explicitly selected and what the observation says has a pending
 * version. Selection alone never prepares a package — a package with nothing pending is reported as blocked rather than
 * quietly given a version — and a pending version alone never prepares one either, because preparation is an explicit
 * operation and inventory is not a request.
 *
 * A private package prepares exactly like a public one. `private: true` withholds npm publication and nothing else, so
 * excluding private packages here would turn a publication rule into a versioning rule.
 */
export function createReleasePreparePlan(
    input: CreateReleasePreparePlanInput,
): ReleasePreparePlan {
    const parsed = createReleasePreparePlanInputSchema.parse(input)
    const selection = new Set(parsed.selection)
    const known = new Set(
        parsed.plan.packages.map((packagePlan) => packagePlan.name),
    )
    const unknown = [...selection].filter((name) => !known.has(name)).toSorted()

    const packages = parsed.plan.packages.map(
        (packagePlan): ReleasePreparePackage => {
            const shared = {
                name: packagePlan.name,
                private: packagePlan.private,
                version: packagePlan.version,
            }

            if (!selection.has(packagePlan.name)) {
                return { ...shared, decision: 'not_selected' }
            }

            if (packagePlan.versionState.state !== 'pending') {
                return {
                    ...shared,
                    decision: 'blocked',
                    reason: 'no_pending_version',
                }
            }

            return {
                ...shared,
                decision: 'planned',
                intendedVersion: packagePlan.versionState.intendedVersion,
            }
        },
    )

    const planned = packages.filter((entry) => entry.decision === 'planned')
    const branch = `${RELEASE_BRANCH_PREFIX}/${parsed.slug}`

    return releasePreparePlanSchema.parse({
        blockers: deriveBlockers({
            planned: planned.length,
            selected: selection.size,
            unknown,
            workingTree: parsed.workingTree ?? 'unknown',
        }),
        branch,
        operation: 'prepare',
        packages,
        pullRequest:
            planned.length === 0
                ? null
                : planReleasePullRequest(
                      parsed.baseBranch,
                      branch,
                      planned.map((entry) => entry.name),
                  ),
        schemaVersion: 1,
        summary: {
            blocked: packages.filter((entry) => entry.decision === 'blocked')
                .length,
            packages: packages.length,
            planned: planned.length,
            private: planned.filter((entry) => entry.private).length,
            selected: selection.size,
        },
    })
}

function deriveBlockers(facts: {
    planned: number
    selected: number
    unknown: ReadonlyArray<string>
    workingTree: 'clean' | 'dirty' | 'unknown'
}): Array<ReleasePrepareBlocker> {
    const blockers: Array<ReleasePrepareBlocker> = []

    if (facts.selected === 0) blockers.push({ reason: 'no_selected_packages' })
    else if (facts.planned === 0) {
        blockers.push({ reason: 'no_preparable_packages' })
    }

    if (facts.unknown.length > 0) {
        blockers.push({
            names: [...facts.unknown],
            reason: 'unknown_selected_package',
        })
    }

    if (facts.workingTree === 'dirty') {
        blockers.push({ reason: 'working_tree_dirty' })
    }

    if (facts.workingTree === 'unknown') {
        blockers.push({ reason: 'working_tree_unknown' })
    }

    return blockers
}

/**
 * Describe the release pull request through the canonical contract.
 *
 * `createPullRequestPlan` is the repository's one pull-request shape, and this uses it rather than introducing a
 * release-specific second one. Only the title and body are release-flavoured, and they follow the convention the
 * repository's own release commits already use.
 */
function planReleasePullRequest(
    base: string,
    head: string,
    names: ReadonlyArray<string>,
): PullRequestPlan {
    const scopes = names.map((name) => shortenScopeName(name)).toSorted()

    return createPullRequestPlan({
        base,
        body: [
            '## Release preparation',
            '',
            `This pull request carries the \`${head}\` release branch into \`${base}\`.`,
            '',
            'Packages selected for preparation:',
            '',
            ...names.toSorted().map((name) => `- ${name}`),
            '',
            'Preparation applies versions. It does not authorize npm publication.',
        ].join('\n'),
        head,
        title: `release(${formatScopes(scopes, 'csv')}): version packages`,
    })
}
