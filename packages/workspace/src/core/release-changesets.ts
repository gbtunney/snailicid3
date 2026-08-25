import { assembleReleasePlan } from '@changesets/assemble-release-plan'
import { readConfig } from '@changesets/config'
import { readPreState } from '@changesets/pre'
import { readChangesets } from '@changesets/read'
import {
    type NewChangeset,
    type PackageJSON,
    type Packages,
} from '@changesets/types'
import { readPackageManifest } from '@snailicid3/node-utils'
import { z } from 'zod'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import {
    isChangesetContentFile,
    readChangesetPackageNames,
} from './changeset-files.js'
import { getRepoRoot } from './git.js'
import { getPackageManager } from './package-manager.js'
import { getWorkspaceSnapshot, type WorkspacePackage } from './packages.js'
import { type ReleasePackagePlan } from './release-plan.js'

/**
 * Changesets release intent, read through Changesets itself.
 *
 * The bump arithmetic here is deliberately none of this module's business. Resolving several changesets for one
 * package, honouring `fixed`/`linked` groups and `ignore`, deciding whether a private package versions at all, and
 * propagating a bump across internal dependents are all decisions Changesets already makes — reimplementing any of them
 * would create a second release calculator that agrees with `changeset version` only until it doesn't. This module
 * supplies inputs to `assembleReleasePlan` and translates its answer onto the plan's intent and version-state axes.
 *
 * The four calls below are the same composition `@changesets/get-release-plan` performs, in the same order, with one
 * substitution: it discovers packages with `@manypkg/get-packages`, which walks the filesystem, and this reads them
 * from {@link getWorkspaceSnapshot} instead. Its signature accepts a cwd and an optional config override but no
 * `Packages`, so adopting it would mean giving up the canonical membership boundary and reinstating the recursive
 * `package.json` walk #206 rules out. That is the only reason it is not used here — do not "simplify" this back to it.
 *
 * Nothing is consumed or written. Changeset files are read and left exactly where they are.
 */

/** The directory Changesets keeps pending release files in. */
const CHANGESET_DIRECTORY = '.changeset'

/** The manifest fields Changesets requires, kept loose so every other field reaches it untouched. */
const changesetsPackageJsonSchema = z.looseObject({
    name: z.string().min(1),
    version: z.string().min(1),
})

export type ObserveWorkspaceChangesetIntentOptions = {
    repoRoot?: string
}

export type ReleaseIntent = ReleasePackagePlan['intent']

export type ReleaseVersionState = ReleasePackagePlan['versionState']

/** One package's release intent and version state, shaped to drop into a release-plan package input. */
export type WorkspaceChangesetIntent = {
    intent: ReleaseIntent
    name: string
    version: string
    versionState: ReleaseVersionState
}

/**
 * The observation itself, over members someone else resolved.
 *
 * Kept off the package barrel deliberately. Tests need to drive this against a fabricated workspace, but a consumer
 * that could supply its own member list would be able to route around {@link getWorkspaceSnapshot} — the boundary this
 * module exists to respect. Splitting the seam here keeps it available inside the package and unreachable outside it.
 */
export async function observeChangesetIntentForMembers(
    repoRoot: string,
    members: ReadonlyArray<WorkspacePackage>,
): Promise<Array<WorkspaceChangesetIntent>> {
    if (!existsSync(path.join(repoRoot, CHANGESET_DIRECTORY))) {
        return members.map(withoutIntent)
    }

    const changesets = await readChangesetsWithFileContext(repoRoot)
    const packages = readChangesetsPackages(repoRoot, members)
    const config = await readChangesetsConfig(repoRoot, packages)
    const preState = await readPreState(repoRoot)
    const assembled = assembleReleasePlan(
        changesets,
        packages,
        config,
        preState,
    )

    return members.map((member) => {
        const release = assembled.releases.find(
            (candidate) => candidate.name === member.name,
        )

        if (release === undefined || release.type === 'none') {
            return withoutIntent(member)
        }

        return {
            intent: {
                bump: release.type,
                reason: describeRelease(release.changesets, changesets),
                source: 'changesets',
            },
            name: member.name,
            version: member.version,
            versionState:
                release.newVersion === member.version
                    ? { state: 'current' }
                    : {
                          intendedVersion: release.newVersion,
                          state: 'pending',
                      },
        }
    })
}

/**
 * Observe pending Changesets intent for every canonical workspace package.
 *
 * Membership comes from {@link getWorkspaceSnapshot}, so a package is considered because the workspace claims it. The
 * manifests behind that membership are handed to Changesets, which decides what each package's next version would be.
 *
 * A package with no pending release carries `source: 'none'` and a `current` version state. That is a statement about
 * Changesets alone: it says nothing about whether the package exists in a registry, and it never authorizes
 * publishing.
 */
export async function observeWorkspaceChangesetIntent(
    options: ObserveWorkspaceChangesetIntentOptions = {},
): Promise<Array<WorkspaceChangesetIntent>> {
    const repoRoot = options.repoRoot ?? getRepoRoot({ fallbackToCwd: true })

    return observeChangesetIntentForMembers(
        repoRoot,
        getWorkspaceSnapshot(repoRoot).list,
    )
}

/**
 * Describe why a package is being released.
 *
 * Changesets reports an empty `changesets` list for a release nothing declared directly, which is precisely a
 * dependency-propagated bump. That distinction comes from Changesets rather than from re-deriving the dependency graph
 * here, so the two can never disagree.
 */
function describeRelease(
    changesetIds: ReadonlyArray<string>,
    changesets: ReadonlyArray<NewChangeset>,
): string {
    if (changesetIds.length === 0) {
        return 'Dependency-propagated internal version bump'
    }

    const summaries = changesetIds
        .map(
            (id) =>
                changesets
                    .find((changeset) => changeset.id === id)
                    ?.summary.trim() ?? '',
        )
        .filter((summary) => summary !== '')

    return summaries.length === 0
        ? `Declared by ${changesetIds.join(', ')} without a summary`
        : summaries.join('\n\n')
}

/** Read the Changesets configuration, refusing to guess past a configuration it rejects. */
async function readChangesetsConfig(
    repoRoot: string,
    packages: Packages,
): Promise<Awaited<ReturnType<typeof readConfig>>['config'] & object> {
    const parsed = await readConfig(repoRoot, packages)

    if (parsed.config === undefined) {
        throw new Error(
            `Unable to read ${CHANGESET_DIRECTORY}/config.json:\n${parsed.errors.join('\n')}`,
        )
    }

    return parsed.config
}

/**
 * Read one manifest as Changesets needs it.
 *
 * Changesets requires a name and a version on every manifest it reasons about, including the root.
 * `readPackageManifest` treats both as optional because a sparse manifest is still a valid one to read, so presence is
 * checked here rather than asserted through a cast that would surface later as an unexplained Changesets failure.
 */
function readChangesetsPackageJson(manifestPath: string): PackageJSON {
    const manifest = readPackageManifest(manifestPath)

    if (!manifest.success) {
        throw new Error(
            `Unable to read ${manifestPath} for Changesets: ${manifest.error}`,
        )
    }

    const parsed = changesetsPackageJsonSchema.safeParse(manifest.data)

    if (!parsed.success) {
        throw new Error(
            `${manifestPath} is missing the name or version Changesets needs:\n${z.prettifyError(parsed.error)}`,
        )
    }

    return parsed.data
}

/**
 * Present canonical workspace membership in the shape Changesets expects.
 *
 * Changesets discovers packages itself through `@manypkg/get-packages`, which walks the filesystem. Handing it the
 * workspace snapshot instead keeps one membership boundary for the whole package: a package Changesets reasons about is
 * a package the package manager listed.
 */
function readChangesetsPackages(
    repoRoot: string,
    members: ReadonlyArray<WorkspacePackage>,
): Packages {
    return {
        packages: members.map((member) => ({
            dir: path.join(repoRoot, member.path),
            packageJson: readChangesetsPackageJson(
                path.join(repoRoot, member.path, 'package.json'),
            ),
        })),
        rootDir: repoRoot,
        rootPackage: {
            dir: repoRoot,
            packageJson: readChangesetsPackageJson(
                path.join(repoRoot, 'package.json'),
            ),
        },
        tool: { type: getPackageManager(repoRoot) },
    }
}

/**
 * Read every pending changeset, naming the file when one will not parse.
 *
 * `readChangesets` parses each file without recording which one it was reading, so a malformed changeset surfaces as a
 * bare frontmatter error. When that happens the files are re-read one at a time through the #239 helper, whose only job
 * is to attach that missing context.
 */
async function readChangesetsWithFileContext(
    repoRoot: string,
): Promise<Array<NewChangeset>> {
    try {
        return await readChangesets(repoRoot)
    } catch (error) {
        for (const file of readdirSync(
            path.join(repoRoot, CHANGESET_DIRECTORY),
        )) {
            const relative = `${CHANGESET_DIRECTORY}/${file}`

            if (isChangesetContentFile(relative)) {
                readChangesetPackageNames(repoRoot, relative)
            }
        }

        throw error
    }
}

/** A package Changesets has nothing pending for. */
function withoutIntent(member: WorkspacePackage): WorkspaceChangesetIntent {
    return {
        intent: { source: 'none' },
        name: member.name,
        version: member.version,
        versionState: { state: 'current' },
    }
}
