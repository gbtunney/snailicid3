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
        channel: z.string().min(1),
        name: z.string().min(1),
        outcome: z.literal('skipped_already_published'),
        version: z.string().min(1),
    }),
    z.strictObject({
        name: z.string().min(1),
        outcome: z.literal('blocked_dependency_cycle'),
        requires: z.array(z.string().min(1)).min(1),
        version: z.string().min(1),
    }),
    z.strictObject({
        name: z.string().min(1),
        outcome: z.literal('blocked_dependency_unavailable'),
        requires: z.array(z.string().min(1)).min(1),
        version: z.string().min(1),
    }),
    z.strictObject({
        channel: z.string().min(1),
        name: z.string().min(1),
        outcome: z.literal('assigned_dist_tag'),
        version: z.string().min(1),
    }),
    z.strictObject({
        channel: z.string().min(1),
        name: z.string().min(1),
        outcome: z.literal('failed_dist_tag_unknown'),
        version: z.string().min(1),
    }),
    z.strictObject({
        channel: z.string().min(1),
        name: z.string().min(1),
        observed: z.string().nullable(),
        outcome: z.literal('failed_dist_tag_verification'),
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
        resumed: z.number().int().nonnegative(),
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
/** What a registry reports about one channel, kept separate from what it reports about a version. */
export type ReleaseDistTagObservation =
    | { kind: 'assigned'; version: string }
    | { kind: 'unassigned' }
    | { kind: 'unknown' }

export type ReleasePublishAdapter = {
    assignDistTag: (
        artifact: ReleasePublishArtifact,
        channel: string,
        registryUrl: string,
    ) => { detail: string; ok: boolean }
    observeDistTag: (
        artifact: ReleasePublishArtifact,
        channel: string,
        registryUrl: string,
    ) => ReleaseDistTagObservation
    observeExact: (
        artifact: ReleasePublishArtifact,
        registryUrl: string,
    ) => string
    publishTarball: (
        artifact: ReleasePublishArtifact,
        channel: string,
        registryUrl: string,
    ) => { detail: string; ok: boolean }
    readIntegrity: (tarball: string) => null | string
}

/** Npm's dist-tag map, read only to decide about the channel and never about version existence. */
const npmDistTagsSchema = z.record(z.string(), z.string())

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

    const executable = parsed.packages.filter(
        (entry) =>
            entry.decision === 'planned' ||
            entry.decision === 'already_published',
    )
    const { cycleNames, order } = orderExecution(executable)
    const steps: Array<ReleasePublishStep> = []
    const results = new Map<string, ReleasePublishStep>()

    for (const entry of order) {
        if (cycleNames.has(entry.name)) {
            const step: ReleasePublishStep = {
                name: entry.name,
                outcome: 'blocked_dependency_cycle',
                requires: [...cycleNames].toSorted((left, right) =>
                    left.localeCompare(right),
                ),
                version: entry.version,
            }
            results.set(entry.name, step)
            steps.push(step)
            continue
        }

        const dependencyFailure = evaluateDependencyReadiness(entry, results)

        if (dependencyFailure !== undefined) {
            results.set(entry.name, dependencyFailure)
            steps.push(dependencyFailure)
            continue
        }

        const step = publishOne(entry, adapter)
        results.set(entry.name, step)
        steps.push(step)
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
            resumed: steps.filter(
                (step) => step.outcome === 'assigned_dist_tag',
            ).length,
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
        observeDistTag: (
            artifact,
            channel,
            registryUrl,
        ): ReleaseDistTagObservation => {
            const result = runNpm([
                'view',
                artifact.name,
                'dist-tags',
                '--json',
                `--registry=${registryUrl}`,
            ])

            if (!result.success) return { kind: 'unknown' }

            const parsed = npmDistTagsSchema.safeParse(
                parseJsonOrNull(result.stdout),
            )

            if (!parsed.success) return { kind: 'unknown' }

            return Object.hasOwn(parsed.data, channel)
                ? { kind: 'assigned', version: parsed.data[channel] }
                : { kind: 'unassigned' }
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
            channel,
            registryUrl,
        ): {
            detail: string
            ok: boolean
        } => {
            const result = runNpm([
                'publish',
                path.resolve(repoRoot, artifact.tarball),
                `--tag=${channel}`,
                `--registry=${registryUrl}`,
            ])

            return { detail: result.stderr.trim(), ok: result.success }
        },
        readIntegrity: (tarball) => readTarballIntegrity(repoRoot, tarball),
    }
}

function evaluateDependencyReadiness(
    entry: Extract<
        ReleasePublishPlan['packages'][number],
        { decision: 'already_published' | 'planned' }
    >,
    results: ReadonlyMap<string, ReleasePublishStep>,
): ReleasePublishStep | undefined {
    const required = entry.requires ?? []
    if (required.length === 0) return undefined

    const missing = required.filter((name) => {
        const result = results.get(name)
        return (
            result === undefined ||
            ![
                'assigned_dist_tag',
                'published',
                'skipped_already_published',
            ].includes(result.outcome)
        )
    })

    if (missing.length > 0) {
        return {
            name: entry.name,
            outcome: 'blocked_dependency_unavailable',
            requires: missing,
            version: entry.version,
        }
    }

    return undefined
}

function orderExecution(
    entries: Array<
        Extract<
            ReleasePublishPlan['packages'][number],
            { decision: 'already_published' | 'planned' }
        >
    >,
): {
    cycleNames: Set<string>
    order: Array<
        Extract<
            ReleasePublishPlan['packages'][number],
            { decision: 'already_published' | 'planned' }
        >
    >
} {
    const remaining = new Map(entries.map((entry) => [entry.name, entry]))
    const indegree = new Map(
        entries.map((entry) => [
            entry.name,
            Math.max(0, entry.requires.length),
        ]),
    )
    const dependents = new Map<string, Array<string>>()

    for (const entry of entries) {
        for (const dependency of entry.requires) {
            if (!remaining.has(dependency)) continue
            const deps = dependents.get(dependency) ?? []
            deps.push(entry.name)
            dependents.set(dependency, deps)
        }
    }

    const ready: Array<(typeof entries)[number]> = [...entries]
        .filter((entry) => (indegree.get(entry.name) ?? 0) === 0)
        .toSorted((left, right) => left.name.localeCompare(right.name))

    const ordered: Array<(typeof entries)[number]> = []

    while (ready.length > 0) {
        const current = ready.shift()
        if (current === undefined) {
            break
        }

        ordered.push(current)
        const nextDependents = dependents.get(current.name) ?? []

        for (const dependent of nextDependents.toSorted((left, right) =>
            left.localeCompare(right),
        )) {
            const next = (indegree.get(dependent) ?? 0) - 1
            indegree.set(dependent, next)

            if (next === 0) {
                const dependentEntry = remaining.get(dependent)
                if (dependentEntry !== undefined) {
                    ready.push(dependentEntry)
                }
            }
        }

        ready.sort((left, right) => left.name.localeCompare(right.name))
    }

    const cycleNames = new Set(
        [...remaining.keys()].filter(
            (name) => !ordered.some((entry) => entry.name === name),
        ),
    )

    if (ordered.length === entries.length) return { cycleNames, order: ordered }

    for (const name of [...cycleNames].toSorted((left, right) =>
        left.localeCompare(right),
    )) {
        const entry = remaining.get(name)
        if (entry !== undefined) ordered.push(entry)
    }

    return { cycleNames, order: ordered }
}

/** Parse a JSON document, returning null rather than throwing on anything unparseable. */
function parseJsonOrNull(value: string): unknown {
    try {
        return JSON.parse(value)
    } catch {
        return null
    }
}

/**
 * Publish one package, re-establishing registry truth on both sides of the mutation.
 *
 * The pre-check is what makes a retry safe: a version that already exists is not republished, whether this run put it
 * there or a previous interrupted one did. The post-check is what makes success meaningful — an adapter reporting
 * success is a claim, and the registry confirming the exact version is the evidence.
 */
function publishOne(
    entry: Extract<
        ReleasePublishPlan['packages'][number],
        { decision: 'already_published' | 'planned' }
    >,
    adapter: ReleasePublishAdapter,
): ReleasePublishStep {
    const { artifact, channel, registryUrl } = entry
    const shared = { name: entry.name, version: entry.version }
    const before = adapter.observeExact(artifact, registryUrl)

    if (entry.decision === 'already_published') {
        return settleDistTag(entry, adapter, true)
    }

    if (before !== 'exists' && before !== 'missing') {
        return {
            ...shared,
            observed: before,
            outcome: 'failed_registry_precheck',
        }
    }

    if (before === 'missing') {
        const observedIntegrity = adapter.readIntegrity(artifact.tarball)

        if (observedIntegrity !== artifact.integrity) {
            return {
                ...shared,
                expected: artifact.integrity,
                observed: observedIntegrity,
                outcome: 'failed_artifact_integrity',
            }
        }

        const published = adapter.publishTarball(artifact, channel, registryUrl)

        if (!published.ok) {
            return {
                ...shared,
                detail: published.detail,
                outcome: 'failed_publish',
            }
        }

        const after = adapter.observeExact(artifact, registryUrl)

        if (after !== 'exists') {
            return {
                ...shared,
                observed: after,
                outcome: 'failed_verification',
            }
        }
    }

    return settleDistTag(entry, adapter, before === 'exists')
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

/**
 * Establish the requested channel, whether or not this run published the version.
 *
 * Existence of the exact version settles one question only: whether to publish. It says nothing about the channel, and
 * treating it as the end of the operation stranded a run whose publication succeeded but whose dist-tag assignment
 * failed — the retry saw the version, skipped everything, and the channel could never be assigned. The channel is
 * therefore its own resumable step, reached on both paths.
 *
 * The channel is observed before assignment so a run with nothing to do reports that rather than reassigning, and
 * observed again afterwards because an adapter reporting success is a claim rather than evidence. That observation
 * decides about the channel only: it never contributes to whether the version exists, which is read from the exact
 * `name@version` alone.
 */
function settleDistTag(
    entry: Extract<
        ReleasePublishPlan['packages'][number],
        { decision: 'already_published' | 'planned' }
    >,
    adapter: ReleasePublishAdapter,
    alreadyPublished: boolean,
): ReleasePublishStep {
    const { artifact, channel, registryUrl } = entry
    const shared = { channel, name: entry.name, version: entry.version }
    const current = adapter.observeDistTag(artifact, channel, registryUrl)

    if (current.kind === 'unknown') {
        return { ...shared, outcome: 'failed_dist_tag_unknown' }
    }

    if (current.kind === 'assigned' && current.version === entry.version) {
        return {
            ...shared,
            outcome: alreadyPublished
                ? 'skipped_already_published'
                : 'published',
        }
    }

    const assigned = adapter.assignDistTag(artifact, channel, registryUrl)

    if (!assigned.ok) {
        return {
            ...shared,
            detail: assigned.detail,
            outcome: 'failed_dist_tag',
        }
    }

    const verified = adapter.observeDistTag(artifact, channel, registryUrl)

    if (verified.kind !== 'assigned' || verified.version !== entry.version) {
        return {
            ...shared,
            observed: verified.kind === 'assigned' ? verified.version : null,
            outcome: 'failed_dist_tag_verification',
        }
    }

    return {
        ...shared,
        outcome: alreadyPublished ? 'assigned_dist_tag' : 'published',
    }
}
