import { type MarkdownTableColumn } from './markdown.js'
import { type ReleasePackagePlan, type ReleasePlan } from './release-plan.js'

/**
 * The one projection of a release plan that every renderer reads.
 *
 * Terminal and Markdown differ only in how they draw a table and a heading. Every decision with meaning in it — which
 * axes get their own column, how an unresolved registry reads, whether a dist-tag sits anywhere near an existence
 * verdict — is made here, once, from the parsed plan. A renderer that reached back into `ReleasePlan` could quietly
 * disagree with its counterpart, which is exactly the "renderer-only release truth" #206 rules out.
 *
 * Nothing in this module recomputes state. Counts come from `plan.summary`, statuses from `packagePlan.status`, and
 * every cell is a formatting of a field the plan already decided.
 */

export type ReleasePlanPresentation = {
    sections: ReadonlyArray<ReleasePresentationSection>
    title: string
}

export type ReleasePresentationFact = {
    label: string
    value: string
}

export type ReleasePresentationSection = {
    facts: ReadonlyArray<ReleasePresentationFact>
    heading: string
    notes: ReadonlyArray<string>
    table: null | ReleasePresentationTable
}

export type ReleasePresentationTable = {
    columns: ReadonlyArray<MarkdownTableColumn>
    rows: ReadonlyArray<ReadonlyArray<string>>
}

const NONE = '—'

const INVENTORY_COLUMNS: ReadonlyArray<MarkdownTableColumn> = [
    { key: 'name', label: 'Package' },
    { key: 'version', label: 'Version' },
    { key: 'status', label: 'Status' },
    { key: 'registryState', label: 'Exact version' },
    { key: 'registryUrl', label: 'Registry' },
    { key: 'distTags', label: 'Dist-tags' },
]

const POLICY_COLUMNS: ReadonlyArray<MarkdownTableColumn> = [
    { key: 'name', label: 'Package' },
    { key: 'versionState', label: 'Version state' },
    { key: 'intent', label: 'Release intent' },
    { key: 'policy', label: 'Publish policy' },
    { key: 'channel', label: 'Channel' },
    { key: 'doctor', label: 'Doctor (artifact / closure)' },
    { key: 'gitTag', label: 'Git tag' },
    { key: 'operations', label: 'Next operations' },
]

/**
 * Project a parsed plan into the shared presentation model.
 *
 * Two tables rather than one wide one, split along the axes #206 keeps separate: what a registry reports about an exact
 * version, and what this repository intends to do about it. Reading a package across both tables is reading the two
 * questions the model refuses to collapse.
 */
export function createReleasePlanPresentation(
    plan: ReleasePlan,
): ReleasePlanPresentation {
    return {
        sections: [
            {
                facts: [
                    { label: 'Operation', value: plan.execution.operation },
                    {
                        label: 'Schema version',
                        value: String(plan.schemaVersion),
                    },
                    {
                        label: 'Packages',
                        value: String(plan.summary.packages),
                    },
                ],
                heading: 'Execution',
                notes: [
                    'This plan observes. It performs no versioning, tagging or publication.',
                ],
                table: null,
            },
            {
                facts: [
                    {
                        label: 'Published',
                        value: String(plan.summary.published),
                    },
                    {
                        label: 'Pending eligible',
                        value: String(plan.summary.eligible),
                    },
                    { label: 'Pending held', value: String(plan.summary.held) },
                    { label: 'Private', value: String(plan.summary.private) },
                    { label: 'Blocked', value: String(plan.summary.blocked) },
                    { label: 'Unknown', value: String(plan.summary.unknown) },
                ],
                heading: 'Summary',
                notes: [],
                table: null,
            },
            {
                facts: [],
                heading: 'Registry inventory',
                notes: inventoryNotes(plan),
                table: {
                    columns: INVENTORY_COLUMNS,
                    rows: plan.packages.map(inventoryRow),
                },
            },
            {
                facts: [],
                heading: 'Release intent and policy',
                notes: policyNotes(plan),
                table: {
                    columns: POLICY_COLUMNS,
                    rows: plan.packages.map(policyRow),
                },
            },
        ],
        title: 'Release plan',
    }
}

/** Dist-tags, rendered as channel pointers and deliberately never as an existence verdict. */
function formatDistTags(packagePlan: ReleasePackagePlan): string {
    const entries = Object.entries(packagePlan.registry.distTags).toSorted(
        ([left], [right]) => left.localeCompare(right),
    )

    return entries.length === 0
        ? NONE
        : entries.map(([tag, version]) => `${tag}=${version}`).join(' ')
}

function formatDoctor(packagePlan: ReleasePackagePlan): string {
    return `${packagePlan.doctor.artifact} / ${packagePlan.doctor.dependencyClosure}`
}

function formatGitTag(packagePlan: ReleasePackagePlan): string {
    return packagePlan.gitTag.selected ? packagePlan.gitTag.name : NONE
}

function formatIntent(packagePlan: ReleasePackagePlan): string {
    return packagePlan.intent.source === 'none'
        ? 'none'
        : `${packagePlan.intent.source} ${packagePlan.intent.bump} — ${packagePlan.intent.reason}`
}

function formatPolicy(packagePlan: ReleasePackagePlan): string {
    return `${packagePlan.policy.decision} — ${packagePlan.policy.reason}`
}

/** A null registry URL is the plan saying no target was resolved, not that npm's default was used. */
function formatRegistryUrl(packagePlan: ReleasePackagePlan): string {
    return packagePlan.registry.registryUrl ?? 'unresolved'
}

function formatVersionState(packagePlan: ReleasePackagePlan): string {
    return packagePlan.versionState.state === 'current'
        ? 'current'
        : `pending → ${packagePlan.versionState.intendedVersion}`
}

/** Notes restate contract invariants; they never describe a conclusion the plan did not already reach. */
function inventoryNotes(plan: ReleasePlan): ReadonlyArray<string> {
    if (plan.packages.length === 0) return ['No workspace packages observed.']

    return [
        '`Exact version` is whether this exact `name@version` exists in the resolved registry. Dist-tags are channel pointers and never determine it.',
        '`unknown_auth`, `unknown_network` and `unknown_registry` mean the lookup did not answer. None of them means unpublished.',
        '`unresolved` means no target registry could be established, so nothing was queried.',
    ]
}

function inventoryRow(packagePlan: ReleasePackagePlan): ReadonlyArray<string> {
    return [
        packagePlan.name,
        packagePlan.version,
        packagePlan.status,
        packagePlan.registry.state,
        formatRegistryUrl(packagePlan),
        formatDistTags(packagePlan),
    ]
}

function policyNotes(plan: ReleasePlan): ReadonlyArray<string> {
    if (plan.packages.length === 0) return []

    return [
        'A missing exact version is inventory, not authorization: publishing requires an explicitly selected package.',
        'A private package is unpublishable through npm whatever the registry reports, and may still carry version and Git-tag intent.',
    ]
}

function policyRow(packagePlan: ReleasePackagePlan): ReadonlyArray<string> {
    return [
        packagePlan.name,
        formatVersionState(packagePlan),
        formatIntent(packagePlan),
        formatPolicy(packagePlan),
        packagePlan.policy.decision === 'selected'
            ? packagePlan.policy.channel
            : NONE,
        formatDoctor(packagePlan),
        formatGitTag(packagePlan),
        packagePlan.availableNextOperations.join(', '),
    ]
}
