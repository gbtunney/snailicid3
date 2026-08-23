import { z } from 'zod'

const nonEmptyStringSchema = z.string().trim().min(1)

/** A registry URL without credentials suitable for reports and machine output. */
export const releaseRegistryUrlSchema = z.url().refine(
    (value) => {
        const url = new URL(value)
        return url.username === '' && url.password === ''
    },
    { message: 'Registry URLs must not contain credentials' },
)

export const releaseExecutionSchema = z.strictObject({
    operation: z.enum(['observe', 'prepare', 'publish', 'tag']),
})

export const releasePlanExecutionSchema = releaseExecutionSchema.extend({
    operation: z.literal('observe'),
})

export const releaseIntentSchema = z.discriminatedUnion('source', [
    z.strictObject({ source: z.literal('none') }),
    z.strictObject({
        bump: z.enum(['major', 'minor', 'patch']),
        reason: nonEmptyStringSchema,
        source: z.literal('changesets'),
    }),
    z.strictObject({
        bump: z.enum(['major', 'minor', 'patch']),
        reason: nonEmptyStringSchema,
        source: z.literal('explicit'),
    }),
])

export const releaseVersionStateSchema = z.discriminatedUnion('state', [
    z.strictObject({ state: z.literal('current') }),
    z.strictObject({
        intendedVersion: nonEmptyStringSchema,
        state: z.literal('pending'),
    }),
])

export const releaseRegistryStateSchema = z.enum([
    'exists',
    'invalid_identity',
    'missing',
    'unknown_auth',
    'unknown_network',
    'unknown_registry',
])

export const releaseRegistryObservationSchema = z.strictObject({
    distTags: z.record(nonEmptyStringSchema, nonEmptyStringSchema),
    registryUrl: releaseRegistryUrlSchema,
    state: releaseRegistryStateSchema,
})

export const releasePublishPolicySchema = z.discriminatedUnion('decision', [
    z.strictObject({
        channel: nonEmptyStringSchema,
        decision: z.literal('selected'),
        reason: nonEmptyStringSchema,
    }),
    z.strictObject({
        decision: z.literal('held'),
        reason: nonEmptyStringSchema,
    }),
])

export const releaseDoctorFactsSchema = z.strictObject({
    artifact: z.enum(['invalid', 'unknown', 'valid']),
    dependencyClosure: z.enum(['blocked', 'unknown', 'valid']),
})

export const releaseGitTagIntentSchema = z.discriminatedUnion('selected', [
    z.strictObject({ selected: z.literal(false) }),
    z.strictObject({
        name: nonEmptyStringSchema,
        selected: z.literal(true),
    }),
])

export const releasePackageStatusSchema = z.enum([
    'blocked_dependency_closure',
    'blocked_invalid_artifact',
    'blocked_unknown_artifact',
    'blocked_unknown_dependency_closure',
    'pending_eligible',
    'pending_held',
    'private_unpublishable',
    'published',
    'unknown_registry',
])

export const releaseNextOperationSchema = z.enum([
    'observe',
    'prepare',
    'publish',
    'tag',
])

export const releasePackagePlanInputSchema = z.strictObject({
    access: z.enum(['public', 'restricted']).optional(),
    doctor: releaseDoctorFactsSchema,
    gitTag: releaseGitTagIntentSchema,
    intent: releaseIntentSchema,
    name: nonEmptyStringSchema,
    policy: releasePublishPolicySchema,
    private: z.boolean(),
    registry: releaseRegistryObservationSchema,
    version: nonEmptyStringSchema,
    versionState: releaseVersionStateSchema,
})

export const releasePackagePlanSchema = releasePackagePlanInputSchema.extend({
    availableNextOperations: z.array(releaseNextOperationSchema),
    status: releasePackageStatusSchema,
})

export const releasePlanSummarySchema = z.strictObject({
    blocked: z.number().int().nonnegative(),
    eligible: z.number().int().nonnegative(),
    held: z.number().int().nonnegative(),
    packages: z.number().int().nonnegative(),
    private: z.number().int().nonnegative(),
    published: z.number().int().nonnegative(),
    unknown: z.number().int().nonnegative(),
})

export const releasePlanSchema = z.strictObject({
    execution: releasePlanExecutionSchema,
    packages: z.array(releasePackagePlanSchema),
    schemaVersion: z.literal(1),
    summary: releasePlanSummarySchema,
})

export type ReleaseDoctorFacts = z.infer<typeof releaseDoctorFactsSchema>
export type ReleaseExecution = z.infer<typeof releaseExecutionSchema>
export type ReleaseGitTagIntent = z.infer<typeof releaseGitTagIntentSchema>
export type ReleaseIntent = z.infer<typeof releaseIntentSchema>
export type ReleaseNextOperation = z.infer<typeof releaseNextOperationSchema>
export type ReleasePackagePlan = z.infer<typeof releasePackagePlanSchema>
export type ReleasePackagePlanInput = z.infer<
    typeof releasePackagePlanInputSchema
>
export type ReleasePackageStatus = z.infer<typeof releasePackageStatusSchema>
export type ReleasePlan = z.infer<typeof releasePlanSchema>
export type ReleasePlanExecution = z.infer<typeof releasePlanExecutionSchema>
export type ReleasePlanSummary = z.infer<typeof releasePlanSummarySchema>
export type ReleasePublishPolicy = z.infer<typeof releasePublishPolicySchema>
export type ReleaseRegistryObservation = z.infer<
    typeof releaseRegistryObservationSchema
>
export type ReleaseRegistryState = z.infer<typeof releaseRegistryStateSchema>
export type ReleaseVersionState = z.infer<typeof releaseVersionStateSchema>
