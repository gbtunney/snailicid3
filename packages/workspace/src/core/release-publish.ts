import { packageNameSchema, packageVersionSchema } from '@snailicid3/node-utils'
import { z } from 'zod'
import { releasePlanSchema } from './release-plan.js'

/**
 * Publish planning: which selected packages may be published, and on what evidence.
 *
 * Its own document, for the reasons #254 established. The observation contract is one stable shape whose every field is
 * present for every document; publishing needs an explicit selection, a packed artifact identity, a requested channel
 * and dependency-closure evidence, none of which observation has a place for. `ReleasePlan.execution` is not widened.
 *
 * Planning authorizes; it never mutates. Nothing here packs, publishes, assigns a dist-tag, or touches Git.
 */

/**
 * The exact packed artifact a publication would send.
 *
 * A directory is not an artifact. "The package folder exists" says nothing about the tarball that will actually reach a
 * registry, and a publisher that resolves the artifact itself can publish something other than what was validated. So
 * the tarball is named explicitly and carries its own `integrity` digest: the executor re-derives the digest from the
 * bytes it is about to send and refuses the operation when it disagrees, which makes substitution detectable rather
 * than merely discouraged. The format is npm's own `sha512-<base64>` so the value can be compared against what a
 * registry and `npm pack` already report.
 */
export const releasePublishArtifactSchema = z.strictObject({
    integrity: z
        .string()
        .regex(
            /^sha512-[A-Za-z0-9+/]{86}==$/u,
            'Artifact integrity must be a sha512 subresource digest',
        ),
    name: packageNameSchema,
    tarball: z.string().trim().min(1),
    version: packageVersionSchema,
})

/**
 * How one required dependency of a selected package is satisfied.
 *
 * Doctor owns the analysis that produces these; Workspace only consumes them. The distinction that matters here is
 * between a dependency that is genuinely resolvable and one that merely happens to have an older artifact on a
 * registry: `available_in_registry` names the exact version that satisfies the range, so a package cannot escape while
 * depending on unpublished workspace state simply because some earlier version exists.
 */
export const releasePublishClosureEdgeSchema = z.discriminatedUnion(
    'resolution',
    [
        z.strictObject({
            name: packageNameSchema,
            range: z.string().trim().min(1),
            resolution: z.literal('available_in_registry'),
            satisfiedBy: packageVersionSchema,
        }),
        z.strictObject({
            name: packageNameSchema,
            range: z.string().trim().min(1),
            resolution: z.literal('included_in_cohort'),
        }),
        z.strictObject({
            name: packageNameSchema,
            resolution: z.literal('embedded_not_exposed'),
        }),
        z.strictObject({
            name: packageNameSchema,
            range: z.string().trim().min(1),
            resolution: z.literal('unavailable'),
        }),
        z.strictObject({
            name: packageNameSchema,
            resolution: z.literal('unknown'),
        }),
    ],
)

/**
 * Doctor's verdict on one selected package, supplied as data.
 *
 * The boundary is about ownership, not packaging. Doctor owns dependency-edge analysis, packed-artifact safety and
 * consumer-facing residual references; Workspace owns selection, registry truth, policy and orchestration. Defining
 * what proof Workspace requires — rather than computing it — is what keeps a second closure analyzer from growing
 * here.
 *
 * Facts crossing as a validated document rather than a function call also means the producer is interchangeable: a
 * Doctor run, a cached report from CI, or a fixture in a test all satisfy the same contract, and a publish plan stays
 * composable and serializable without Doctor's analysis machinery having to run. This schema is therefore the contract
 * #226 must eventually satisfy, and #226 not existing yet is a missing producer rather than a reason to weaken it.
 */
export const releasePublishDoctorEvidenceSchema = z.strictObject({
    artifact: z.enum(['invalid', 'unknown', 'valid']),
    closure: z.discriminatedUnion('state', [
        z.strictObject({
            edges: z.array(releasePublishClosureEdgeSchema),
            state: z.literal('valid'),
        }),
        z.strictObject({
            edges: z.array(releasePublishClosureEdgeSchema),
            state: z.literal('blocked'),
        }),
        z.strictObject({ state: z.literal('unknown') }),
    ]),
})

/** Everything the caller must prove about one candidate before it may be published. */
export const releasePublishCandidateSchema = z.strictObject({
    artifact: releasePublishArtifactSchema,
    doctor: releasePublishDoctorEvidenceSchema,
    name: packageNameSchema,
})

/**
 * One package's outcome, discriminated by the reason rather than by a flag.
 *
 * Unknown is never folded into blocked and never into eligible. "Doctor did not report" and "Doctor reported a problem"
 * call for different responses, and so do "the registry says no" and "the registry did not answer".
 */
export const releasePublishPackageSchema = z.discriminatedUnion('decision', [
    z.strictObject({
        artifact: releasePublishArtifactSchema,
        channel: z.string().trim().min(1),
        decision: z.literal('planned'),
        name: packageNameSchema,
        registryUrl: z.url(),
        requires: z.array(packageNameSchema),
        version: packageVersionSchema,
    }),
    z.strictObject({
        channel: z.string().trim().min(1),
        decision: z.literal('already_published'),
        name: packageNameSchema,
        registryUrl: z.url(),
        requires: z.array(packageNameSchema),
        version: packageVersionSchema,
    }),
    z.strictObject({
        decision: z.literal('not_selected'),
        name: packageNameSchema,
        version: packageVersionSchema,
    }),
    z.strictObject({
        decision: z.literal('blocked_private'),
        name: packageNameSchema,
        version: packageVersionSchema,
    }),
    z.strictObject({
        decision: z.literal('blocked_policy_held'),
        name: packageNameSchema,
        reason: z.string().trim().min(1),
        version: packageVersionSchema,
    }),
    z.strictObject({
        decision: z.literal('blocked_registry_unknown'),
        name: packageNameSchema,
        registryState: z.enum([
            'unknown_auth',
            'unknown_network',
            'unknown_registry',
        ]),
        version: packageVersionSchema,
    }),
    z.strictObject({
        decision: z.literal('blocked_artifact_unavailable'),
        name: packageNameSchema,
        version: packageVersionSchema,
    }),
    z.strictObject({
        decision: z.literal('blocked_artifact_invalid'),
        name: packageNameSchema,
        version: packageVersionSchema,
    }),
    z.strictObject({
        decision: z.literal('unknown_artifact_facts'),
        name: packageNameSchema,
        version: packageVersionSchema,
    }),
    z.strictObject({
        decision: z.literal('blocked_dependency_closure'),
        name: packageNameSchema,
        unresolved: z.array(packageNameSchema),
        version: packageVersionSchema,
    }),
    z.strictObject({
        decision: z.literal('unknown_dependency_closure'),
        name: packageNameSchema,
        version: packageVersionSchema,
    }),
    z.strictObject({
        decision: z.literal('blocked_closure_dependency_not_in_cohort'),
        missing: z.array(packageNameSchema).min(1),
        name: packageNameSchema,
        version: packageVersionSchema,
    }),
])

/**
 * Whether the plan permits mutation at all.
 *
 * A typed decision rather than a boolean, because an executor that only learns "not authorized" cannot tell a plan
 * nobody selected anything in from one whose evidence never arrived. Any unresolved prerequisite withholds
 * authorization for the whole operation.
 */
export const releasePublishAuthorizationSchema = z.discriminatedUnion('state', [
    z.strictObject({ state: z.literal('authorized') }),
    z.strictObject({
        reasons: z
            .array(
                z.enum([
                    'no_selected_packages',
                    'no_publishable_packages',
                    'unresolved_prerequisites',
                    'unknown_selected_package',
                ]),
            )
            .min(1),
        state: z.literal('withheld'),
    }),
])

export const releasePublishPlanSummarySchema = z.strictObject({
    alreadyPublished: z.number().int().nonnegative(),
    blocked: z.number().int().nonnegative(),
    packages: z.number().int().nonnegative(),
    planned: z.number().int().nonnegative(),
    selected: z.number().int().nonnegative(),
    unknown: z.number().int().nonnegative(),
})

/** The canonical publish document, versioned independently of the observation it reads. */
export const releasePublishPlanSchema = z.strictObject({
    authorization: releasePublishAuthorizationSchema,
    channel: z.string().trim().min(1),
    operation: z.literal('publish'),
    packages: z.array(releasePublishPackageSchema),
    schemaVersion: z.literal(1),
    summary: releasePublishPlanSummarySchema,
})

export const createReleasePublishPlanInputSchema = z.strictObject({
    candidates: z.array(releasePublishCandidateSchema),
    channel: z.string().trim().min(1),
    plan: releasePlanSchema,
    selection: z.array(packageNameSchema),
})

export type CreateReleasePublishPlanInput = z.input<
    typeof createReleasePublishPlanInputSchema
>
export type ReleasePublishArtifact = z.infer<
    typeof releasePublishArtifactSchema
>
export type ReleasePublishAuthorization = ReleasePublishPlan['authorization']
export type ReleasePublishCandidate = z.infer<
    typeof releasePublishCandidateSchema
>
export type ReleasePublishClosureEdge = z.infer<
    typeof releasePublishClosureEdgeSchema
>
export type ReleasePublishDoctorEvidence = z.infer<
    typeof releasePublishDoctorEvidenceSchema
>
export type ReleasePublishPackage = ReleasePublishPlan['packages'][number]
export type ReleasePublishPlan = z.infer<typeof releasePublishPlanSchema>
export type ReleasePublishPlanSummary = ReleasePublishPlan['summary']

type ReleasePlanPackage = z.infer<typeof releasePlanSchema>['packages'][number]

/**
 * Plan a publication over an observed release plan.
 *
 * Selection is explicit and is the only way into a cohort. Registry absence, Changesets intent, a pending version, an
 * absent Git tag and a non-private manifest are all inventory; none of them selects anything.
 *
 * A dependency needed by a selected package is never auto-selected to satisfy closure. When Doctor says an edge is
 * satisfied by cohort membership and that package was not in fact selected, the requirement is reported so the caller
 * can widen the selection deliberately.
 */
export function createReleasePublishPlan(
    input: CreateReleasePublishPlanInput,
): ReleasePublishPlan {
    const parsed = createReleasePublishPlanInputSchema.parse(input)
    const selection = new Set(parsed.selection)
    const known = new Set(
        parsed.plan.packages.map((packagePlan) => packagePlan.name),
    )
    const candidates = new Map(
        parsed.candidates.map((candidate) => [candidate.name, candidate]),
    )
    const unknownSelection = [...selection].filter((name) => !known.has(name))

    const packages = parsed.plan.packages.map(
        (packagePlan): ReleasePublishPackage =>
            decidePackage({
                candidate: candidates.get(packagePlan.name),
                channel: parsed.channel,
                cohort: selection,
                packagePlan,
                selected: selection.has(packagePlan.name),
            }),
    )

    const planned = packages.filter((entry) => entry.decision === 'planned')
    const alreadyPublished = packages.filter(
        (entry) => entry.decision === 'already_published',
    )
    const unknown = packages.filter((entry) =>
        entry.decision.startsWith('unknown_'),
    )
    const blocked = packages.filter((entry) =>
        entry.decision.startsWith('blocked_'),
    )

    return releasePublishPlanSchema.parse({
        authorization: deriveAuthorization({
            alreadyPublished: alreadyPublished.length,
            blocked: blocked.length,
            planned: planned.length,
            selected: selection.size,
            unknown: unknown.length,
            unknownSelection: unknownSelection.length,
        }),
        channel: parsed.channel,
        operation: 'publish',
        packages,
        schemaVersion: 1,
        summary: {
            alreadyPublished: alreadyPublished.length,
            blocked: blocked.length,
            packages: packages.length,
            planned: planned.length,
            selected: selection.size,
            unknown: unknown.length,
        },
    })
}

/**
 * Reduce one package's facts to an outcome.
 *
 * Precedence is load-bearing. `private` settles the answer before any registry state is read, so a private package is
 * never publishable whatever a registry reports. An exact version that already exists settles it next, which is what
 * makes a repeated run idempotent rather than a republish. A registry that did not answer blocks before any policy or
 * evidence is consulted, so an unanswered lookup can never fall through into permission.
 */
function decidePackage(facts: {
    candidate: ReleasePublishCandidate | undefined
    channel: string
    cohort: ReadonlySet<string>
    packagePlan: ReleasePlanPackage
    selected: boolean
}): ReleasePublishPackage {
    const { candidate, channel, cohort, packagePlan, selected } = facts
    const shared = { name: packagePlan.name, version: packagePlan.version }
    const requires = deriveRequiredDependencies(candidate)

    if (!selected) return { ...shared, decision: 'not_selected' }
    if (packagePlan.private) return { ...shared, decision: 'blocked_private' }

    if (
        packagePlan.registry.state !== 'exists' &&
        packagePlan.registry.state !== 'missing'
    ) {
        return {
            ...shared,
            decision: 'blocked_registry_unknown',
            registryState: packagePlan.registry.state,
        }
    }

    // Policy, Doctor, and closure gate mutation on both the publish and channel-reconcile paths
    if (packagePlan.policy.decision === 'held') {
        return {
            ...shared,
            decision: 'blocked_policy_held',
            reason: packagePlan.policy.reason,
        }
    }

    if (
        candidate === undefined ||
        candidate.artifact.version !== packagePlan.version ||
        candidate.artifact.name !== packagePlan.name
    ) {
        return { ...shared, decision: 'blocked_artifact_unavailable' }
    }

    if (candidate.doctor.artifact === 'invalid') {
        return { ...shared, decision: 'blocked_artifact_invalid' }
    }

    if (candidate.doctor.artifact === 'unknown') {
        return { ...shared, decision: 'unknown_artifact_facts' }
    }

    const { closure } = candidate.doctor

    if (closure.state === 'unknown') {
        return { ...shared, decision: 'unknown_dependency_closure' }
    }

    const unknownEdges = closure.edges.filter(
        (edge) => edge.resolution === 'unknown',
    )

    if (unknownEdges.length > 0) {
        return { ...shared, decision: 'unknown_dependency_closure' }
    }

    if (closure.state === 'blocked') {
        return {
            ...shared,
            decision: 'blocked_dependency_closure',
            unresolved: closure.edges
                .filter((edge) => edge.resolution === 'unavailable')
                .map((edge) => edge.name),
        }
    }

    const missing = closure.edges
        .filter(
            (edge) =>
                edge.resolution === 'included_in_cohort' &&
                !cohort.has(edge.name),
        )
        .map((edge) => edge.name)

    if (missing.length > 0) {
        return {
            ...shared,
            decision: 'blocked_closure_dependency_not_in_cohort',
            missing,
        }
    }

    if (packagePlan.registry.registryUrl === null) {
        return {
            ...shared,
            decision: 'blocked_registry_unknown',
            registryState: 'unknown_registry',
        }
    }

    if (packagePlan.registry.state === 'exists') {
        return {
            ...shared,
            channel,
            decision: 'already_published',
            registryUrl: packagePlan.registry.registryUrl,
            requires,
        }
    }

    return {
        ...shared,
        artifact: candidate.artifact,
        channel,
        decision: 'planned',
        registryUrl: packagePlan.registry.registryUrl,
        requires,
    }
}

function deriveAuthorization(facts: {
    alreadyPublished: number
    blocked: number
    planned: number
    selected: number
    unknown: number
    unknownSelection: number
}): ReleasePublishAuthorization {
    const reasons: Array<
        | 'no_publishable_packages'
        | 'no_selected_packages'
        | 'unknown_selected_package'
        | 'unresolved_prerequisites'
    > = []

    if (facts.selected === 0) reasons.push('no_selected_packages')
    else if (facts.planned + facts.alreadyPublished === 0) {
        reasons.push('no_publishable_packages')
    }

    if (facts.unknown > 0 || facts.blocked > 0) {
        reasons.push('unresolved_prerequisites')
    }

    if (facts.unknownSelection > 0) reasons.push('unknown_selected_package')

    return reasons.length === 0
        ? { state: 'authorized' }
        : { reasons, state: 'withheld' }
}

function deriveRequiredDependencies(
    candidate: ReleasePublishCandidate | undefined,
): Array<string> {
    if (candidate === undefined) return []

    return candidate.doctor.closure.state === 'valid'
        ? candidate.doctor.closure.edges
              .filter((edge) => edge.resolution === 'included_in_cohort')
              .map((edge) => edge.name)
        : []
}
