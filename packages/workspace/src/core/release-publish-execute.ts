import { runCommand } from '@snailicid3/node-utils'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { getRepoRoot } from './git.js'
import {
    type ReleasePublishArtifact,
    type ReleasePublishPlan,
    releasePublishPlanSchema,
} from './release-publish.js'
import {
    type NpmCommandRunner,
    observeExactVersion,
} from './release-registry.js'

/**
 * Executing an authorized publish plan.
 *
 * Every step is separated because every step fails differently and resumes differently. A version that reached the
 * registry but whose dist-tag assignment failed is not an unpublished version, and treating the two the same would
 * either republish something already published or leave a channel silently unassigned.
 *
 * Registry truth is the resume point. Nothing here records that a step succeeded and trusts that record later: each run
 * re-asks the registry what exists, so an interrupted execution resumes from what is actually true rather than from
 * hidden state a previous run left behind.
 */

/** One step's outcome, discriminated so a caller cannot read failure without reading which step failed. */
export const releasePublishStepSchema = z.discriminatedUnion('outcome', [
    z.strictObject({
        channel: z.string().min(1),
        name: z.string().min(1),
        outcome: z.literal('published'),
        version: z.string().min(1),
    }),
    z.strictObject({
        name: z.string().min(1),
        outcome: z.literal('skipped_already_published'),
        version: z.string().min(1),
    }),
    z.strictObject({
        name: z.string().min(1),
        observed: z.string().min(1),
        outcome: z.literal('failed_registry_precheck'),
        version: z.string().min(1),
    }),
    z.strictObject({
        expected: z.string().min(1),
        name: z.string().min(1),
        observed: z.string().nullable(),
        outcome: z.literal('failed_artifact_integrity'),
        version: z.string().min(1),
    }),
    z.strictObject({
        detail: z.string(),
        name: z.string().min(1),
        outcome: z.literal('failed_publish'),
        version: z.string().min(1),
    }),
    z.strictObject({
        name: z.string().min(1),
        observed: z.string().min(1),
        outcome: z.literal('failed_verification'),
        version: z.string().min(1),
    }),
    z.strictObject({
        channel: z.string().min(1),
        detail: z.string(),
        name: z.string().min(1),
        outcome: z.literal('failed_dist_tag'),
        version: z.string().min(1),
    }),
])

export const releasePublishResultSchema = z.strictObject({
    operation: z.literal('publish'),
    schemaVersion: z.literal(1),
    started: z.boolean(),
    steps: z.array(releasePublishStepSchema),
    summary: z.strictObject({
        failed: z.number().int().nonnegative(),
        published: z.number().int().nonnegative(),
        skipped: z.number().int().nonnegative(),
    }),
})

export type ExecuteReleasePublishPlanOptions = {
    repoRoot?: string
}
/**
 * The mutation surface, injected so every failure path is reachable from a fake.
 *
 * Internal. This is a test seam and an implementation detail, not part of the supported external execution model:
 * exporting it would let a consumer substitute the thing that decides what "published" means, which is the one
 * substitution this whole contract exists to prevent.
 */
export type ReleasePublishAdapter = {
    assignDistTag: (
        artifact: ReleasePublishArtifact,
        channel: string,
        registryUrl: string,
    ) => { detail: string; ok: boolean }
    observeExact: (
        artifact: ReleasePublishArtifact,
        registryUrl: string,
    ) => string
    publishTarball: (
        artifact: ReleasePublishArtifact,
        registryUrl: string,
    ) => { detail: string; ok: boolean }
    readIntegrity: (tarball: string) => null | string
}

export type ReleasePublishResult = z.infer<typeof releasePublishResultSchema>

export type ReleasePublishStep = ReleasePublishResult['steps'][number]

/**
 * The state machine, over an injected adapter.
 *
 * Kept off the package barrel: tests need to drive every failure path, and a live registry will not produce those on
 * demand, but a caller able to supply its own adapter could report a publication that never happened.
 */
export function executePublishWithAdapter(
    plan: ReleasePublishPlan,
    adapter: ReleasePublishAdapter,
): ReleasePublishResult {
    const parsed = releasePublishPlanSchema.parse(plan)

    if (parsed.authorization.state !== 'authorized') {
        return buildResult(false, [])
    }

    const steps: Array<ReleasePublishStep> = []

    for (const entry of parsed.packages) {
        if (entry.decision !== 'planned') continue

        steps.push(publishOne(entry, adapter))
    }

    return buildResult(true, steps)
}

/**
 * Execute an authorized publish plan against the real npm registry.
 *
 * Refuses outright unless the plan authorized the operation, so a plan carrying any unresolved prerequisite can never
 * reach a registry.
 */
export function executeReleasePublishPlan(
    plan: ReleasePublishPlan,
    options: ExecuteReleasePublishPlanOptions = {},
): ReleasePublishResult {
    const repoRoot = options.repoRoot ?? getRepoRoot({ fallbackToCwd: true })

    return executePublishWithAdapter(
        plan,
        createNpmPublishAdapter(repoRoot, (args) =>
            runCommand('npm', args, { cwd: repoRoot }),
        ),
    )
}

function buildResult(
    started: boolean,
    steps: ReadonlyArray<ReleasePublishStep>,
): ReleasePublishResult {
    return releasePublishResultSchema.parse({
        operation: 'publish',
        schemaVersion: 1,
        started,
        steps: [...steps],
        summary: {
            failed: steps.filter((step) => step.outcome.startsWith('failed_'))
                .length,
            published: steps.filter((step) => step.outcome === 'published')
                .length,
            skipped: steps.filter(
                (step) => step.outcome === 'skipped_already_published',
            ).length,
        },
    })
}

/**
 * The live adapter.
 *
 * Never exercised by this package's tests, deliberately: its whole job is to mutate a public registry. It exists so the
 * public entry point is meaningful, and it is the one part of this module that has not been proven by running it.
 */
function createNpmPublishAdapter(
    repoRoot: string,
    runNpm: NpmCommandRunner,
): ReleasePublishAdapter {
    return {
        assignDistTag: (
            artifact,
            channel,
            registryUrl,
        ): {
            detail: string
            ok: boolean
        } => {
            const result = runNpm([
                'dist-tag',
                'add',
                `${artifact.name}@${artifact.version}`,
                channel,
                `--registry=${registryUrl}`,
            ])

            return { detail: result.stderr.trim(), ok: result.success }
        },
        observeExact: (artifact, registryUrl) =>
            observeExactVersion(
                artifact.name,
                artifact.version,
                registryUrl,
                runNpm,
            ),
        publishTarball: (
            artifact,
            registryUrl,
        ): {
            detail: string
            ok: boolean
        } => {
            const result = runNpm([
                'publish',
                path.resolve(repoRoot, artifact.tarball),
                `--registry=${registryUrl}`,
            ])

            return { detail: result.stderr.trim(), ok: result.success }
        },
        readIntegrity: (tarball) => readTarballIntegrity(repoRoot, tarball),
    }
}

/**
 * Publish one package, re-establishing registry truth on both sides of the mutation.
 *
 * The pre-check is what makes a retry safe: a version that already exists is skipped rather than republished, whether
 * this run put it there or a previous interrupted one did. The post-check is what makes success meaningful — an adapter
 * reporting success is a claim, and the registry confirming the exact version is the evidence.
 */
function publishOne(
    entry: Extract<
        ReleasePublishPlan['packages'][number],
        { decision: 'planned' }
    >,
    adapter: ReleasePublishAdapter,
): ReleasePublishStep {
    const { artifact, channel, registryUrl } = entry
    const shared = { name: entry.name, version: entry.version }
    const before = adapter.observeExact(artifact, registryUrl)

    if (before === 'exists') {
        return { ...shared, outcome: 'skipped_already_published' }
    }

    if (before !== 'missing') {
        return {
            ...shared,
            observed: before,
            outcome: 'failed_registry_precheck',
        }
    }

    const observedIntegrity = adapter.readIntegrity(artifact.tarball)

    if (observedIntegrity !== artifact.integrity) {
        return {
            ...shared,
            expected: artifact.integrity,
            observed: observedIntegrity,
            outcome: 'failed_artifact_integrity',
        }
    }

    const published = adapter.publishTarball(artifact, registryUrl)

    if (!published.ok) {
        return {
            ...shared,
            detail: published.detail,
            outcome: 'failed_publish',
        }
    }

    const after = adapter.observeExact(artifact, registryUrl)

    if (after !== 'exists') {
        return { ...shared, observed: after, outcome: 'failed_verification' }
    }

    const tagged = adapter.assignDistTag(artifact, channel, registryUrl)

    if (!tagged.ok) {
        return {
            ...shared,
            channel,
            detail: tagged.detail,
            outcome: 'failed_dist_tag',
        }
    }

    return { ...shared, channel, outcome: 'published' }
}

/**
 * Derive the digest of the bytes that would actually be sent.
 *
 * npm's own `sha512-<base64>` form, so the value is comparable with what `npm pack` and a registry already report. A
 * directory has no digest and returns null, which is what stops a workspace folder standing in for the validated
 * tarball.
 */
function readTarballIntegrity(
    repoRoot: string,
    tarball: string,
): null | string {
    try {
        const bytes = readFileSync(path.resolve(repoRoot, tarball))

        return `sha512-${createHash('sha512').update(bytes).digest('base64')}`
    } catch {
        return null
    }
}
