import { type CommandResult } from '@snailicid3/node-utils'
import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { type WorkspacePackage } from './packages.js'
import { createReleasePlan } from './release-plan.js'
import {
    type NpmCommandRunner,
    observeWorkspaceRegistry,
} from './release-registry.js'

const ok = (stdout: string): CommandResult => ({
    status: 0,
    stderr: '',
    stdout,
    success: true,
})

const failed = (stdout: string, stderr = ''): CommandResult => ({
    status: 1,
    stderr,
    stdout,
    success: false,
})

const npmError = (code: string): CommandResult =>
    failed(
        JSON.stringify({ error: { code, detail: '', summary: '' } }),
        `npm error code ${code}\n`,
    )

const packument = (
    versions: Array<string>,
    distTags: Record<string, string> = {},
): CommandResult => ok(JSON.stringify({ 'dist-tags': distTags, versions }))

const workspacePackage = (
    overrides: Partial<WorkspacePackage> = {},
): WorkspacePackage => ({
    name: '@snailicid3/workspace',
    path: 'packages/workspace',
    version: '0.1.1',
    ...overrides,
})

/**
 * Record every npm invocation and answer it from a fixture table.
 *
 * `config get` is matched by its first argument; everything else is a `view`, answered by the package name so a test
 * can vary one package's outcome without describing the others.
 */
const stubNpm = (
    answers: {
        configFails?: boolean
        configValues?: Record<string, string>
        views?: Record<string, CommandResult>
    } = {},
): { calls: Array<Array<string>>; runNpm: NpmCommandRunner } => {
    const calls: Array<Array<string>> = []

    return {
        calls,
        runNpm: (args) => {
            calls.push([...args])

            if (args[0] === 'config') {
                return answers.configFails === true
                    ? failed('', 'npm error code EINVALIDCONFIG')
                    : ok(renderNpmConfig(args.slice(2), answers.configValues))
            }

            const name = args[1] ?? ''

            return answers.views?.[name] ?? packument([])
        },
    }
}

/**
 * Reproduce npm's two config output shapes.
 *
 * `npm config get` prints a bare value for a single key and `key=value` lines for several. A stub that always printed
 * one shape would let a parser bug pass, so the shape is derived from the keys the code actually asked for.
 */
const renderNpmConfig = (
    keys: ReadonlyArray<string>,
    values: Record<string, string> = {
        registry: 'https://registry.npmjs.org/',
    },
): string => {
    const valueFor = (key: string): string => values[key] ?? 'undefined'

    if (keys.length === 1) return `${valueFor(keys[0])}\n`

    return `${keys.map((key) => `${key}=${valueFor(key)}`).join('\n')}\n`
}

const observeOne = (
    pkg: Partial<WorkspacePackage>,
    answers: Parameters<typeof stubNpm>[0] = {},
    repoRoot = '/nonexistent-repo-root',
) => {
    const { calls, runNpm } = stubNpm(answers)
    const [observation] = observeWorkspaceRegistry({
        packages: [workspacePackage(pkg)],
        repoRoot,
        runNpm,
    })

    return { calls, observation }
}

const viewCall = (calls: Array<Array<string>>): Array<string> | undefined =>
    calls.find((call) => call[0] === 'view')

describe('release registry observation', () => {
    describe('exact version existence', () => {
        it('reports exists when the exact version is in the version list', () => {
            const { observation } = observeOne(
                { version: '0.1.1' },
                {
                    views: {
                        '@snailicid3/workspace': packument(['0.1.0', '0.1.1']),
                    },
                },
            )

            expect(observation.registry.state).toBe('exists')
        })

        it('reports missing when the registry answers without that version', () => {
            const { observation } = observeOne(
                { version: '0.2.0' },
                {
                    views: {
                        '@snailicid3/workspace': packument(['0.1.0', '0.1.1']),
                    },
                },
            )

            expect(observation.registry.state).toBe('missing')
        })

        it('reports missing when the registry has never heard of the package', () => {
            const { observation } = observeOne(
                {},
                { views: { '@snailicid3/workspace': npmError('E404') } },
            )

            expect(observation.registry.state).toBe('missing')
        })

        it('accepts a single-version packument printed as a bare string', () => {
            const { observation } = observeOne(
                { version: '1.0.0' },
                {
                    views: {
                        '@snailicid3/workspace': ok(
                            JSON.stringify({ versions: '1.0.0' }),
                        ),
                    },
                },
            )

            expect(observation.registry.state).toBe('exists')
        })
    })

    describe('dist-tag independence', () => {
        it('never lets latest make an absent version look published', () => {
            const { observation } = observeOne(
                { version: '0.2.0' },
                {
                    views: {
                        '@snailicid3/workspace': packument(['0.1.0'], {
                            latest: '0.2.0',
                            next: '0.2.0',
                        }),
                    },
                },
            )

            expect(observation.registry.state).toBe('missing')
            expect(observation.registry.distTags).toEqual({
                latest: '0.2.0',
                next: '0.2.0',
            })
        })

        it('never lets a stale latest make a present version look absent', () => {
            const { observation } = observeOne(
                { version: '0.2.0' },
                {
                    views: {
                        '@snailicid3/workspace': packument(['0.1.0', '0.2.0'], {
                            latest: '0.1.0',
                        }),
                    },
                },
            )

            expect(observation.registry.state).toBe('exists')
            expect(observation.registry.distTags.latest).toBe('0.1.0')
        })

        it('records no dist-tags when the lookup did not answer', () => {
            const { observation } = observeOne(
                {},
                { views: { '@snailicid3/workspace': npmError('ENEEDAUTH') } },
            )

            expect(observation.registry.distTags).toEqual({})
        })
    })

    describe('failure classification', () => {
        it.each([
            ['E401', 'unknown_auth'],
            ['E403', 'unknown_auth'],
            ['ENEEDAUTH', 'unknown_auth'],
            ['EOTP', 'unknown_auth'],
            ['ECONNREFUSED', 'unknown_network'],
            ['ENOTFOUND', 'unknown_network'],
            ['ETIMEDOUT', 'unknown_network'],
            ['CERT_HAS_EXPIRED', 'unknown_network'],
            ['E500', 'unknown_registry'],
            ['E502', 'unknown_registry'],
            ['E429', 'unknown_registry'],
            ['ESOMETHINGNEW', 'unknown_registry'],
        ])('maps %s to %s', (code, expected) => {
            const { observation } = observeOne(
                {},
                { views: { '@snailicid3/workspace': npmError(code) } },
            )

            expect(observation.registry.state).toBe(expected)
        })

        it('never turns a failure into missing except for a registry 404', () => {
            for (const code of ['E401', 'ECONNREFUSED', 'E503', 'EUNKNOWN']) {
                const { observation } = observeOne(
                    {},
                    { views: { '@snailicid3/workspace': npmError(code) } },
                )

                expect(observation.registry.state).not.toBe('missing')
                expect(observation.registry.state).not.toBe('exists')
            }
        })

        it('recovers a code from stderr when --json printed nothing usable', () => {
            const { observation } = observeOne(
                {},
                {
                    views: {
                        '@snailicid3/workspace': failed(
                            'not json at all',
                            'npm error code ECONNRESET\n',
                        ),
                    },
                },
            )

            expect(observation.registry.state).toBe('unknown_network')
        })

        it('falls back to unknown_registry when nothing is readable', () => {
            const { observation } = observeOne(
                {},
                {
                    views: {
                        '@snailicid3/workspace': failed('garbage', 'silence'),
                    },
                },
            )

            expect(observation.registry.state).toBe('unknown_registry')
        })
    })

    describe('target registry resolution', () => {
        it('uses the npm default when nothing is configured', () => {
            const { calls, observation } = observeOne({}, { configValues: {} })

            expect(observation.registry.registryUrl).toBe(
                'https://registry.npmjs.org/',
            )
            expect(viewCall(calls)).toContain(
                '--registry=https://registry.npmjs.org/',
            )
        })

        it('prefers a scope registry over the overall registry', () => {
            const { calls, observation } = observeOne(
                {},
                {
                    configValues: {
                        '@snailicid3:registry': 'https://npm.example.test/',
                        'registry': 'https://registry.npmjs.org/',
                    },
                },
            )

            expect(observation.registry.registryUrl).toBe(
                'https://npm.example.test/',
            )
            expect(viewCall(calls)).toContain(
                '--@snailicid3:registry=https://npm.example.test/',
            )
        })

        it('pins the scope key so a configured scope registry cannot silently win', () => {
            const { calls } = observeOne(
                {},
                { configValues: { registry: 'https://npm.example.test/' } },
            )

            expect(viewCall(calls)).toContain(
                '--@snailicid3:registry=https://npm.example.test/',
            )
        })

        it('does not pin a scope key for an unscoped package', () => {
            const { calls } = observeOne({ name: 'lodash' })
            const view = viewCall(calls) ?? []

            expect(
                view.some((argument) => argument.includes(':registry=')),
            ).toBe(false)
        })

        it('reads the bare value npm prints for an unscoped single-key query', () => {
            const { calls, observation } = observeOne(
                { name: 'lodash' },
                { configValues: { registry: 'https://npm.example.test/' } },
            )

            expect(calls.find((call) => call[0] === 'config')).toEqual([
                'config',
                'get',
                'registry',
            ])
            expect(observation.registry.registryUrl).toBe(
                'https://npm.example.test/',
            )
        })

        it('requests only registry keys, never a full config dump', () => {
            const { calls } = observeOne({})
            const configCall = calls.find((call) => call[0] === 'config')

            expect(configCall).toEqual([
                'config',
                'get',
                'registry',
                '@snailicid3:registry',
            ])
        })

        it('falls back to the npm default when the config command fails', () => {
            const { observation } = observeOne({}, { configFails: true })

            expect(observation.registry.registryUrl).toBe(
                'https://registry.npmjs.org/',
            )
        })

        it('treats an unusable configured registry as unknown rather than querying the default', () => {
            const { calls, observation } = observeOne(
                {},
                { configValues: { registry: 'not-a-url' } },
            )

            expect(observation.registry.state).toBe('unknown_registry')
            expect(viewCall(calls)).toBeUndefined()
        })

        it('rejects a non-http registry protocol', () => {
            const { observation } = observeOne(
                {},
                { configValues: { registry: 'ftp://npm.example.test/' } },
            )

            expect(observation.registry.state).toBe('unknown_registry')
        })

        it('prefers publishConfig.registry over every configured registry', () => {
            withRepo(
                {
                    'packages/workspace': {
                        name: '@snailicid3/workspace',
                        publishConfig: {
                            registry: 'https://publish.example.test/',
                        },
                        version: '0.1.1',
                    },
                },
                (repoRoot) => {
                    const { observation } = observeOne(
                        {},
                        {
                            configValues: {
                                '@snailicid3:registry':
                                    'https://scope.example.test/',
                                'registry': 'https://registry.npmjs.org/',
                            },
                        },
                        repoRoot,
                    )

                    expect(observation.registry.registryUrl).toBe(
                        'https://publish.example.test/',
                    )
                },
            )
        })
    })

    describe('credential handling', () => {
        it('strips inline credentials from the recorded registry URL', () => {
            const { observation } = observeOne(
                {},
                {
                    configValues: {
                        registry: 'https://someone:s3cret@npm.example.test/',
                    },
                },
            )

            expect(observation.registry.registryUrl).toBe(
                'https://npm.example.test/',
            )
            expect(observation.registry.registryUrl).not.toContain('s3cret')
            expect(observation.registry.registryUrl).not.toContain('someone')
        })

        it('still queries with the credentialed URL so authentication survives', () => {
            const { calls } = observeOne(
                {},
                {
                    configValues: {
                        registry: 'https://someone:s3cret@npm.example.test/',
                    },
                },
            )

            expect(viewCall(calls)).toContain(
                '--registry=https://someone:s3cret@npm.example.test/',
            )
        })
    })

    describe('private packages', () => {
        it('never queries a registry for a private package', () => {
            const { calls, observation } = observeOne({ private: true })

            expect(viewCall(calls)).toBeUndefined()
            expect(observation.registry.state).toBe('unknown_registry')
            expect(observation.registry.distTags).toEqual({})
        })

        it('still records the registry the package would have targeted', () => {
            const { observation } = observeOne(
                { private: true },
                { configValues: { registry: 'https://npm.example.test/' } },
            )

            expect(observation.registry.registryUrl).toBe(
                'https://npm.example.test/',
            )
        })

        it('keeps private precedence once the observation reaches a plan', () => {
            const { observation } = observeOne({ private: true })
            const plan = createReleasePlan({
                packages: [
                    {
                        doctor: {
                            artifact: 'valid',
                            dependencyClosure: 'valid',
                        },
                        gitTag: { selected: false },
                        intent: { source: 'none' },
                        name: observation.name,
                        policy: {
                            channel: 'latest',
                            decision: 'selected',
                            reason: 'Explicit release operation',
                        },
                        private: true,
                        registry: observation.registry,
                        version: observation.version,
                        versionState: { state: 'current' },
                    },
                ],
            })

            expect(plan.packages[0]?.status).toBe('private_unpublishable')
            expect(plan.packages[0]?.availableNextOperations).not.toContain(
                'publish',
            )
        })
    })

    describe('release plan integration', () => {
        it('produces observations a release plan accepts unchanged', () => {
            const { runNpm } = stubNpm({
                views: {
                    '@snailicid3/config': packument(['0.3.0'], {
                        latest: '0.3.0',
                    }),
                    '@snailicid3/workspace': packument(['0.1.0'], {
                        latest: '0.1.0',
                    }),
                },
            })

            const observations = observeWorkspaceRegistry({
                packages: [
                    workspacePackage({ version: '0.2.0' }),
                    workspacePackage({
                        name: '@snailicid3/config',
                        path: 'packages/config',
                        version: '0.3.0',
                    }),
                ],
                repoRoot: '/nonexistent-repo-root',
                runNpm,
            })

            const plan = createReleasePlan({
                packages: observations.map((observation) => ({
                    doctor: { artifact: 'valid', dependencyClosure: 'valid' },
                    gitTag: { selected: false },
                    intent: { source: 'none' },
                    name: observation.name,
                    policy: {
                        decision: 'held',
                        reason: 'No publish operation selected',
                    },
                    private: false,
                    registry: observation.registry,
                    version: observation.version,
                    versionState: { state: 'current' },
                })),
            })

            expect(plan.summary.published).toBe(1)
            expect(plan.summary.held).toBe(1)
            expect(plan.summary.eligible).toBe(0)
        })

        it('asks the registry once per non-private package', () => {
            const { calls } = observeOne({})

            expect(calls.filter((call) => call[0] === 'view')).toHaveLength(1)
            expect(calls.filter((call) => call[0] === 'config')).toHaveLength(1)
        })
    })
})

/** Build a throwaway repository whose manifests the resolver can actually read. */
function withRepo(
    manifests: Record<string, object>,
    assertion: (repoRoot: string) => void,
): void {
    const repoRoot = mkdtempSync(path.join(tmpdir(), 'release-registry-'))

    try {
        for (const [directory, manifest] of Object.entries(manifests)) {
            mkdirSync(path.join(repoRoot, directory), { recursive: true })
            writeFileSync(
                path.join(repoRoot, directory, 'package.json'),
                JSON.stringify(manifest),
            )
        }

        assertion(repoRoot)
    } finally {
        rmSync(repoRoot, { force: true, recursive: true })
    }
}
