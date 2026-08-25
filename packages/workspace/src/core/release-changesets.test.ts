import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { type WorkspacePackage } from './packages.js'
import { observeChangesetIntentForMembers } from './release-changesets.js'
import { createReleasePlan } from './release-plan.js'

type Manifest = {
    dependencies?: Record<string, string>
    name: string
    private?: boolean
    version: string
}

type Repo = {
    changesets?: Record<string, string>
    config?: Record<string, unknown>
    manifests: Array<Manifest>
    withChangesetDirectory?: boolean
}

const CONFIG = {
    access: 'public',
    baseBranch: 'main',
    changelog: false,
    commit: false,
    fixed: [],
    ignore: [],
    linked: [],
    updateInternalDependencies: 'patch',
}

const directoryFor = (manifest: Manifest): string =>
    `packages/${manifest.name.replace('@', '').replace('/', '-')}`

const members = (repo: Repo): Array<WorkspacePackage> =>
    repo.manifests.map((manifest) => ({
        name: manifest.name,
        path: directoryFor(manifest),
        version: manifest.version,
        ...(manifest.private === undefined
            ? {}
            : { private: manifest.private }),
    }))

/** Build a throwaway repository whose changesets and manifests real Changesets can read. */
const withRepo = async <T>(
    repo: Repo,
    assertion: (repoRoot: string) => Promise<T>,
): Promise<T> => {
    const repoRoot = mkdtempSync(path.join(tmpdir(), 'changeset-intent-'))

    try {
        writeFileSync(
            path.join(repoRoot, 'package.json'),
            JSON.stringify({
                name: '@test/root',
                packageManager: 'pnpm@10.0.0',
                private: true,
                version: '0.0.0',
            }),
        )

        for (const manifest of repo.manifests) {
            const directory = path.join(repoRoot, directoryFor(manifest))
            mkdirSync(directory, { recursive: true })
            writeFileSync(
                path.join(directory, 'package.json'),
                JSON.stringify(manifest),
            )
        }

        if (repo.withChangesetDirectory !== false) {
            mkdirSync(path.join(repoRoot, '.changeset'), { recursive: true })
            writeFileSync(
                path.join(repoRoot, '.changeset/config.json'),
                JSON.stringify({ ...CONFIG, ...repo.config }),
            )

            for (const [id, body] of Object.entries(repo.changesets ?? {})) {
                writeFileSync(path.join(repoRoot, `.changeset/${id}.md`), body)
            }
        }

        return await assertion(repoRoot)
    } finally {
        rmSync(repoRoot, { force: true, recursive: true })
    }
}

const observe = async (repo: Repo) =>
    withRepo(repo, async (repoRoot) =>
        observeChangesetIntentForMembers(repoRoot, members(repo)),
    )

const changeset = (releases: Record<string, string>, summary: string): string =>
    [
        '---',
        ...Object.entries(releases).map(([name, bump]) => `'${name}': ${bump}`),
        '---',
        '',
        summary,
        '',
    ].join('\n')

const alpha: Manifest = { name: '@test/alpha', version: '1.0.0' }
const beta: Manifest = { name: '@test/beta', version: '2.3.4' }

const intentFor = (
    observations: Array<{ intent: unknown; name: string }>,
    name: string,
) => observations.find((observation) => observation.name === name)?.intent

describe('changesets release intent', () => {
    it('reports no intent when nothing is pending', async () => {
        const observations = await observe({ manifests: [alpha, beta] })

        expect(observations).toHaveLength(2)
        for (const observation of observations) {
            expect(observation.intent).toEqual({ source: 'none' })
            expect(observation.versionState).toEqual({ state: 'current' })
        }
    })

    it('reports no intent when the repository has no changeset directory', async () => {
        const observations = await observe({
            manifests: [alpha],
            withChangesetDirectory: false,
        })

        expect(observations[0]?.intent).toEqual({ source: 'none' })
    })

    it('joins one declared bump with its intended version', async () => {
        const observations = await observe({
            changesets: {
                'brave-pans-sing': changeset(
                    { '@test/alpha': 'minor' },
                    'Add a thing',
                ),
            },
            manifests: [alpha, beta],
        })

        expect(intentFor(observations, '@test/alpha')).toEqual({
            bump: 'minor',
            reason: 'Add a thing',
            source: 'changesets',
        })
        expect(
            observations.find((o) => o.name === '@test/alpha')?.versionState,
        ).toEqual({ intendedVersion: '1.1.0', state: 'pending' })
        expect(intentFor(observations, '@test/beta')).toEqual({
            source: 'none',
        })
    })

    it('joins several packages from one changeset', async () => {
        const observations = await observe({
            changesets: {
                'many-cats-run': changeset(
                    { '@test/alpha': 'patch', '@test/beta': 'major' },
                    'Touch both',
                ),
            },
            manifests: [alpha, beta],
        })

        expect(intentFor(observations, '@test/alpha')).toMatchObject({
            bump: 'patch',
        })
        expect(intentFor(observations, '@test/beta')).toMatchObject({
            bump: 'major',
        })
        expect(
            observations.find((o) => o.name === '@test/beta')?.versionState,
        ).toEqual({ intendedVersion: '3.0.0', state: 'pending' })
    })

    it('resolves several changesets for one package by highest bump, not by file order', async () => {
        const observations = await observe({
            changesets: {
                'aaa-first': changeset({ '@test/alpha': 'minor' }, 'Minor'),
                'zzz-last': changeset({ '@test/alpha': 'patch' }, 'Patch'),
            },
            manifests: [alpha],
        })

        expect(intentFor(observations, '@test/alpha')).toMatchObject({
            bump: 'minor',
        })
        expect(
            observations.find((o) => o.name === '@test/alpha')?.versionState,
        ).toEqual({ intendedVersion: '1.1.0', state: 'pending' })
    })

    it('carries every summary that declared a package', async () => {
        const observations = await observe({
            changesets: {
                'aaa-first': changeset({ '@test/alpha': 'patch' }, 'First'),
                'zzz-last': changeset({ '@test/alpha': 'patch' }, 'Second'),
            },
            manifests: [alpha],
        })
        const intent = intentFor(observations, '@test/alpha') as {
            reason: string
        }

        expect(intent.reason).toContain('First')
        expect(intent.reason).toContain('Second')
    })

    /**
     * Private-package intent is Changesets' decision, not this module's.
     *
     * `@changesets/config@4` defaults `privatePackages` to `{ version: false, tag: false }`, so a private package is
     * skipped unless the repository opts in. Both directions are pinned here because overriding either one would mean
     * this module disagreeing with what `changeset version` would actually do.
     */
    it('gives a private package release intent when the repository opts in', async () => {
        const observations = await observe({
            changesets: {
                'quiet-moons-wait': changeset(
                    { '@test/alpha': 'minor' },
                    'Internal change',
                ),
            },
            config: { privatePackages: { tag: true, version: true } },
            manifests: [{ ...alpha, private: true }],
        })

        expect(intentFor(observations, '@test/alpha')).toMatchObject({
            bump: 'minor',
            source: 'changesets',
        })
        expect(
            observations.find((o) => o.name === '@test/alpha')?.versionState,
        ).toEqual({ intendedVersion: '1.1.0', state: 'pending' })
    })

    it('reports no intent for a private package when the repository has not opted in', async () => {
        const observations = await observe({
            changesets: {
                'quiet-moons-wait': changeset(
                    { '@test/alpha': 'minor' },
                    'Internal change',
                ),
            },
            manifests: [{ ...alpha, private: true }],
        })

        expect(intentFor(observations, '@test/alpha')).toEqual({
            source: 'none',
        })
    })

    describe('dependency propagation', () => {
        it('reports a propagated bump that no changeset declared', async () => {
            const observations = await observe({
                changesets: {
                    'bump-alpha': changeset(
                        { '@test/alpha': 'minor' },
                        'Change alpha',
                    ),
                },
                manifests: [
                    alpha,
                    {
                        dependencies: { '@test/alpha': '1.0.0' },
                        name: '@test/beta',
                        version: '2.3.4',
                    },
                ],
            })

            expect(intentFor(observations, '@test/beta')).toEqual({
                bump: 'patch',
                reason: 'Dependency-propagated internal version bump',
                source: 'changesets',
            })
            expect(
                observations.find((o) => o.name === '@test/beta')?.versionState,
            ).toEqual({ intendedVersion: '2.3.5', state: 'pending' })
        })

        it('keeps a declared bump distinguishable from a propagated one', async () => {
            const observations = await observe({
                changesets: {
                    'bump-both': changeset(
                        { '@test/alpha': 'minor', '@test/beta': 'major' },
                        'Change both deliberately',
                    ),
                },
                manifests: [
                    alpha,
                    {
                        dependencies: { '@test/alpha': '1.0.0' },
                        name: '@test/beta',
                        version: '2.3.4',
                    },
                ],
            })

            expect(intentFor(observations, '@test/beta')).toEqual({
                bump: 'major',
                reason: 'Change both deliberately',
                source: 'changesets',
            })
        })
    })

    describe('malformed changesets', () => {
        it('names the file that would not parse', async () => {
            await expect(
                observe({
                    changesets: {
                        'broken-file': '---\nthis is not: [valid\n---\n\nBody',
                    },
                    manifests: [alpha],
                }),
            ).rejects.toThrow(/broken-file\.md/u)
        })

        it('does not silently drop a malformed changeset', async () => {
            await expect(
                observe({
                    changesets: {
                        'broken-file': '---\nthis is not: [valid\n---\n\nBody',
                        'good-file': changeset(
                            { '@test/alpha': 'patch' },
                            'Fine',
                        ),
                    },
                    manifests: [alpha],
                }),
            ).rejects.toThrow()
        })
    })

    describe('independence from registry observation', () => {
        it('gives intent to a package whose exact version already exists', async () => {
            const observations = await observe({
                changesets: {
                    'bump-alpha': changeset(
                        { '@test/alpha': 'minor' },
                        'Change alpha',
                    ),
                },
                manifests: [alpha],
            })
            const observation = observations[0]
            const plan = createReleasePlan({
                packages: [
                    {
                        doctor: {
                            artifact: 'valid',
                            dependencyClosure: 'valid',
                        },
                        gitTag: { selected: false },
                        intent: observation.intent,
                        name: observation.name,
                        policy: {
                            decision: 'held',
                            reason: 'No publish operation selected',
                        },
                        private: false,
                        registry: {
                            distTags: { latest: '1.0.0' },
                            registryUrl: 'https://registry.npmjs.org/',
                            state: 'exists',
                        },
                        version: observation.version,
                        versionState: observation.versionState,
                    },
                ],
            })

            expect(plan.packages[0]?.intent).toMatchObject({
                source: 'changesets',
            })
            expect(plan.packages[0]?.status).toBe('published')
            expect(plan.packages[0]?.availableNextOperations).not.toContain(
                'publish',
            )
        })

        it('leaves a package with no changeset unpublishable merely for being absent', async () => {
            const observations = await observe({ manifests: [alpha] })
            const observation = observations[0]
            const plan = createReleasePlan({
                packages: [
                    {
                        doctor: {
                            artifact: 'valid',
                            dependencyClosure: 'valid',
                        },
                        gitTag: { selected: false },
                        intent: observation.intent,
                        name: observation.name,
                        policy: {
                            decision: 'held',
                            reason: 'No publish operation selected',
                        },
                        private: false,
                        registry: {
                            distTags: {},
                            registryUrl: 'https://registry.npmjs.org/',
                            state: 'missing',
                        },
                        version: observation.version,
                        versionState: observation.versionState,
                    },
                ],
            })

            expect(plan.packages[0]?.intent).toEqual({ source: 'none' })
            expect(plan.packages[0]?.status).toBe('pending_held')
            expect(plan.packages[0]?.availableNextOperations).not.toContain(
                'publish',
            )
        })
    })
})
