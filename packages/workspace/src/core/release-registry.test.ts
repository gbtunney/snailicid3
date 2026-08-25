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
    type WorkspaceRegistryObservation,
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

type StubAnswers = {
    configFails?: boolean
    configValues?: Record<string, string>
    views?: Record<string, CommandResult>
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

/** Record every npm invocation and answer it from a fixture table. */
const stubNpm = (
    answers: StubAnswers = {},
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

            return answers.views?.[args[1] ?? ''] ?? packument([])
        },
    }
}

const workspacePackage = (
    overrides: Partial<WorkspacePackage> = {},
): WorkspacePackage => ({
    name: '@snailicid3/workspace',
    path: 'packages/workspace',
    version: '0.1.1',
    ...overrides,
})

type Scenario = {
    answers?: StubAnswers
    manifest?: null | object
    pkg?: Partial<WorkspacePackage>
}

/**
 * Observe one package inside a throwaway repository.
 *
 * The manifest is written for real because `publishConfig.registry` resolution reads it, and a manifest that cannot be
 * read is now a distinct outcome rather than a quiet absence. Passing `manifest: null` writes no file at all, which is
 * how the unreadable path is exercised.
 */
const observeOne = ({ answers = {}, manifest = {}, pkg = {} }: Scenario = {}): {
    calls: Array<Array<string>>
    observation: WorkspaceRegistryObservation
} => {
    const member = workspacePackage(pkg)
    const repoRoot = mkdtempSync(path.join(tmpdir(), 'release-registry-'))

    try {
        if (manifest !== null) {
            mkdirSync(path.join(repoRoot, member.path), { recursive: true })
            writeFileSync(
                path.join(repoRoot, member.path, 'package.json'),
                JSON.stringify({
                    name: member.name,
                    version: member.version,
                    ...manifest,
                }),
            )
        }

        const { calls, runNpm } = stubNpm(answers)
        const [observation] = observeWorkspaceRegistry({
            packages: [member],
            repoRoot,
            runNpm,
        })

        return { calls, observation }
    } finally {
        rmSync(repoRoot, { force: true, recursive: true })
    }
}

const viewCall = (calls: Array<Array<string>>): Array<string> | undefined =>
    calls.find((call) => call[0] === 'view')

const configCall = (calls: Array<Array<string>>): Array<string> | undefined =>
    calls.find((call) => call[0] === 'config')

describe('release registry observation', () => {
    describe('exact version existence', () => {
        it('reports exists when the exact version is in the version list', () => {
            const { observation } = observeOne({
                answers: {
                    views: {
                        '@snailicid3/workspace': packument(['0.1.0', '0.1.1']),
                    },
                },
                pkg: { version: '0.1.1' },
            })

            expect(observation.registry.state).toBe('exists')
        })

        it('reports missing when the registry answers without that version', () => {
            const { observation } = observeOne({
                answers: {
                    views: {
                        '@snailicid3/workspace': packument(['0.1.0', '0.1.1']),
                    },
                },
                pkg: { version: '0.2.0' },
            })

            expect(observation.registry.state).toBe('missing')
        })

        it('reports missing when the registry has never heard of the package', () => {
            const { observation } = observeOne({
                answers: {
                    views: { '@snailicid3/workspace': npmError('E404') },
                },
            })

            expect(observation.registry.state).toBe('missing')
        })

        it('accepts a single-version packument printed as a bare string', () => {
            const { observation } = observeOne({
                answers: {
                    views: {
                        '@snailicid3/workspace': ok(
                            JSON.stringify({ versions: '1.0.0' }),
                        ),
                    },
                },
                pkg: { version: '1.0.0' },
            })

            expect(observation.registry.state).toBe('exists')
        })
    })

    describe('dist-tag independence', () => {
        it('never lets latest make an absent version look published', () => {
            const { observation } = observeOne({
                answers: {
                    views: {
                        '@snailicid3/workspace': packument(['0.1.0'], {
                            latest: '0.2.0',
                            next: '0.2.0',
                        }),
                    },
                },
                pkg: { version: '0.2.0' },
            })

            expect(observation.registry.state).toBe('missing')
            expect(observation.registry.distTags).toEqual({
                latest: '0.2.0',
                next: '0.2.0',
            })
        })

        it('never lets a stale latest make a present version look absent', () => {
            const { observation } = observeOne({
                answers: {
                    views: {
                        '@snailicid3/workspace': packument(['0.1.0', '0.2.0'], {
                            latest: '0.1.0',
                        }),
                    },
                },
                pkg: { version: '0.2.0' },
            })

            expect(observation.registry.state).toBe('exists')
            expect(observation.registry.distTags.latest).toBe('0.1.0')
        })

        it('records no dist-tags when the lookup did not answer', () => {
            const { observation } = observeOne({
                answers: {
                    views: { '@snailicid3/workspace': npmError('ENEEDAUTH') },
                },
            })

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
            const { observation } = observeOne({
                answers: { views: { '@snailicid3/workspace': npmError(code) } },
            })

            expect(observation.registry.state).toBe(expected)
        })

        it('never turns a failure into missing except for a registry 404', () => {
            for (const code of ['E401', 'ECONNREFUSED', 'E503', 'EUNKNOWN']) {
                const { observation } = observeOne({
                    answers: {
                        views: { '@snailicid3/workspace': npmError(code) },
                    },
                })

                expect(observation.registry.state).not.toBe('missing')
                expect(observation.registry.state).not.toBe('exists')
            }
        })

        it('still names the registry that reported a failure', () => {
            const { observation } = observeOne({
                answers: {
                    views: { '@snailicid3/workspace': npmError('E401') },
                },
            })

            expect(observation.registry.registryUrl).toBe(
                'https://registry.npmjs.org/',
            )
        })

        it('recovers a code from stderr when --json printed nothing usable', () => {
            const { observation } = observeOne({
                answers: {
                    views: {
                        '@snailicid3/workspace': failed(
                            'not json at all',
                            'npm error code ECONNRESET\n',
                        ),
                    },
                },
            })

            expect(observation.registry.state).toBe('unknown_network')
        })

        it('falls back to unknown_registry when nothing is readable', () => {
            const { observation } = observeOne({
                answers: {
                    views: {
                        '@snailicid3/workspace': failed('garbage', 'silence'),
                    },
                },
            })

            expect(observation.registry.state).toBe('unknown_registry')
        })
    })

    describe('target registry resolution', () => {
        it('uses the npm default when nothing is configured', () => {
            const { observation } = observeOne({
                answers: { configValues: {} },
            })

            expect(observation.registry.registryUrl).toBe(
                'https://registry.npmjs.org/',
            )
        })

        it('prefers a scope registry over the overall registry', () => {
            const { observation } = observeOne({
                answers: {
                    configValues: {
                        '@snailicid3:registry': 'https://npm.example.test/',
                        'registry': 'https://registry.npmjs.org/',
                    },
                },
            })

            expect(observation.registry.registryUrl).toBe(
                'https://npm.example.test/',
            )
        })

        it('reads the bare value npm prints for an unscoped single-key query', () => {
            const { calls, observation } = observeOne({
                answers: {
                    configValues: { registry: 'https://npm.example.test/' },
                },
                pkg: { name: 'lodash', path: 'packages/lodash' },
            })

            expect(configCall(calls)).toEqual(['config', 'get', 'registry'])
            expect(observation.registry.registryUrl).toBe(
                'https://npm.example.test/',
            )
        })

        it('requests only registry keys, never a full config dump', () => {
            const { calls } = observeOne()

            expect(configCall(calls)).toEqual([
                'config',
                'get',
                'registry',
                '@snailicid3:registry',
            ])
        })

        it('prefers publishConfig.registry over every configured registry', () => {
            const { observation } = observeOne({
                answers: {
                    configValues: {
                        '@snailicid3:registry': 'https://scope.example.test/',
                        'registry': 'https://registry.npmjs.org/',
                    },
                },
                manifest: {
                    publishConfig: {
                        registry: 'https://publish.example.test/',
                    },
                },
            })

            expect(observation.registry.registryUrl).toBe(
                'https://publish.example.test/',
            )
        })
    })

    describe('registry flags in argv', () => {
        it('passes no registry flags when npm config already selects the registry', () => {
            const { calls } = observeOne({
                answers: {
                    configValues: { registry: 'https://npm.example.test/' },
                },
            })

            expect(
                (viewCall(calls) ?? []).some((argument) =>
                    argument.includes('registry='),
                ),
            ).toBe(false)
        })

        it('overrides npm only for a publishConfig target, pinning the scope key', () => {
            const { calls } = observeOne({
                answers: {
                    configValues: {
                        '@snailicid3:registry': 'https://scope.example.test/',
                        'registry': 'https://registry.npmjs.org/',
                    },
                },
                manifest: {
                    publishConfig: {
                        registry: 'https://publish.example.test/',
                    },
                },
            })

            expect(viewCall(calls)).toEqual([
                'view',
                '@snailicid3/workspace',
                'versions',
                'dist-tags',
                '--json',
                '--registry=https://publish.example.test/',
                '--@snailicid3:registry=https://publish.example.test/',
            ])
        })

        it('does not pin a scope key for an unscoped publishConfig target', () => {
            const { calls } = observeOne({
                manifest: {
                    publishConfig: {
                        registry: 'https://publish.example.test/',
                    },
                },
                pkg: { name: 'lodash', path: 'packages/lodash' },
            })

            expect(
                (viewCall(calls) ?? []).some((argument) =>
                    argument.includes(':registry='),
                ),
            ).toBe(false)
        })
    })

    describe('credential handling', () => {
        it('strips inline credentials from the recorded registry URL', () => {
            const { observation } = observeOne({
                answers: {
                    configValues: {
                        registry: 'https://someone:s3cret@npm.example.test/',
                    },
                },
            })

            expect(observation.registry.registryUrl).toBe(
                'https://npm.example.test/',
            )
        })

        it('never copies a configured credential into process arguments', () => {
            const { calls } = observeOne({
                answers: {
                    configValues: {
                        registry: 'https://someone:s3cret@npm.example.test/',
                    },
                },
            })

            const everyArgument = calls.flat().join(' ')

            expect(everyArgument).not.toContain('s3cret')
            expect(everyArgument).not.toContain('someone')
        })

        it('leaves an inline-credential registry to npm rather than re-stating it', () => {
            const { calls, observation } = observeOne({
                answers: {
                    configValues: {
                        registry: 'https://someone:s3cret@npm.example.test/',
                    },
                },
            })

            expect(viewCall(calls)).toBeDefined()
            expect(
                (viewCall(calls) ?? []).some((argument) =>
                    argument.includes('registry='),
                ),
            ).toBe(false)
            expect(observation.registry.registryUrl).toBe(
                'https://npm.example.test/',
            )
        })

        it('treats an inline-credential publishConfig target as unresolved', () => {
            const { calls, observation } = observeOne({
                manifest: {
                    publishConfig: {
                        registry:
                            'https://someone:s3cret@publish.example.test/',
                    },
                },
            })

            expect(observation.registry.state).toBe('unknown_registry')
            expect(observation.registry.registryUrl).toBeNull()
            expect(viewCall(calls)).toBeUndefined()
            expect(calls.flat().join(' ')).not.toContain('s3cret')
        })
    })

    describe('unresolved registries', () => {
        it('records no registry URL and asks nothing when the config read fails', () => {
            const { calls, observation } = observeOne({
                answers: { configFails: true },
            })

            expect(observation.registry.state).toBe('unknown_registry')
            expect(observation.registry.registryUrl).toBeNull()
            expect(viewCall(calls)).toBeUndefined()
        })

        it('still resolves a publishConfig target when the config read fails', () => {
            const { calls, observation } = observeOne({
                answers: { configFails: true },
                manifest: {
                    publishConfig: {
                        registry: 'https://publish.example.test/',
                    },
                },
            })

            expect(observation.registry.registryUrl).toBe(
                'https://publish.example.test/',
            )
            expect(viewCall(calls)).toBeDefined()
        })

        it('does not treat an unreadable manifest as an absent publishConfig', () => {
            const { calls, observation } = observeOne({ manifest: null })

            expect(observation.registry.state).toBe('unknown_registry')
            expect(observation.registry.registryUrl).toBeNull()
            expect(viewCall(calls)).toBeUndefined()
        })

        it('treats an unusable configured registry as unresolved, not as the default', () => {
            const { calls, observation } = observeOne({
                answers: { configValues: { registry: 'not-a-url' } },
            })

            expect(observation.registry.state).toBe('unknown_registry')
            expect(observation.registry.registryUrl).toBeNull()
            expect(viewCall(calls)).toBeUndefined()
        })

        it('rejects a non-http registry protocol', () => {
            const { calls, observation } = observeOne({
                answers: {
                    configValues: { registry: 'ftp://npm.example.test/' },
                },
            })

            expect(observation.registry.state).toBe('unknown_registry')
            expect(observation.registry.registryUrl).toBeNull()
            expect(viewCall(calls)).toBeUndefined()
        })

        it('never reports missing or exists without naming a registry', () => {
            for (const scenario of [
                { answers: { configFails: true } },
                { manifest: null },
                { answers: { configValues: { registry: 'not-a-url' } } },
            ] satisfies Array<Scenario>) {
                const { observation } = observeOne(scenario)

                expect(observation.registry.registryUrl).toBeNull()
                expect(['exists', 'missing']).not.toContain(
                    observation.registry.state,
                )
            }
        })
    })

    describe('private packages', () => {
        it('never queries a registry for a private package', () => {
            const { calls, observation } = observeOne({
                pkg: { private: true },
            })

            expect(viewCall(calls)).toBeUndefined()
            expect(observation.registry.state).toBe('unknown_registry')
            expect(observation.registry.distTags).toEqual({})
        })

        it('still records the registry the package would have targeted', () => {
            const { observation } = observeOne({
                answers: {
                    configValues: { registry: 'https://npm.example.test/' },
                },
                pkg: { private: true },
            })

            expect(observation.registry.registryUrl).toBe(
                'https://npm.example.test/',
            )
        })

        it('keeps private precedence once the observation reaches a plan', () => {
            const { observation } = observeOne({ pkg: { private: true } })
            const plan = planFrom([observation], { private: true })

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
                    '@snailicid3/workspace': packument(['0.1.0'], {
                        latest: '0.1.0',
                    }),
                },
            })
            const repoRoot = mkdtempSync(
                path.join(tmpdir(), 'release-registry-'),
            )

            try {
                mkdirSync(path.join(repoRoot, 'packages/workspace'), {
                    recursive: true,
                })
                writeFileSync(
                    path.join(repoRoot, 'packages/workspace/package.json'),
                    JSON.stringify({
                        name: '@snailicid3/workspace',
                        version: '0.2.0',
                    }),
                )

                const observations = observeWorkspaceRegistry({
                    packages: [workspacePackage({ version: '0.2.0' })],
                    repoRoot,
                    runNpm,
                })

                expect(planFrom(observations).summary.held).toBe(1)
            } finally {
                rmSync(repoRoot, { force: true, recursive: true })
            }
        })

        it('accepts an unresolved observation without a registry URL', () => {
            const { observation } = observeOne({
                answers: { configFails: true },
            })
            const plan = planFrom([observation])

            expect(plan.packages[0]?.registry.registryUrl).toBeNull()
            expect(plan.packages[0]?.status).toBe('unknown_registry')
            expect(plan.packages[0]?.availableNextOperations).not.toContain(
                'publish',
            )
        })

        it('asks the registry once per non-private package', () => {
            const { calls } = observeOne()

            expect(calls.filter((call) => call[0] === 'view')).toHaveLength(1)
            expect(calls.filter((call) => call[0] === 'config')).toHaveLength(1)
        })
    })
})

/** Feed observations through the pure plan boundary exactly as a caller would. */
function planFrom(
    observations: ReadonlyArray<WorkspaceRegistryObservation>,
    overrides: { private?: boolean } = {},
) {
    return createReleasePlan({
        packages: observations.map((observation) => ({
            doctor: { artifact: 'valid', dependencyClosure: 'valid' },
            gitTag: { selected: false },
            intent: { source: 'none' },
            name: observation.name,
            policy: {
                decision: 'held',
                reason: 'No publish operation selected',
            },
            private: overrides.private ?? false,
            registry: observation.registry,
            version: observation.version,
            versionState: { state: 'current' },
        })),
    })
}
