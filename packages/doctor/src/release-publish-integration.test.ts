import type { WorkspacePackage, WorkspaceSnapshot } from '@snailicid3/workspace'
import {
    createReleasePlan,
    createReleasePublishPlan,
} from '@snailicid3/workspace'
import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
    analyzeWorkspaceDependencyClosure,
    type PackedPackageManifest,
} from './dependency-closure.js'

const INTEGRITY = `sha512-${'a'.repeat(86)}==`

const temporaryRoots: Array<string> = []

afterEach(() => {
    for (const root of temporaryRoots.splice(0)) {
        rmSync(root, { force: true, recursive: true })
    }
})

/**
 * Doctor produces evidence; Workspace decides. These read Doctor's own output rather than a hand-written document, so a
 * change that made Doctor emit something #206 cannot consume would fail here rather than in a release.
 */
describe('doctor closure evidence consumed by release publish planning', () => {
    it('never authorizes publication from Doctor evidence alone', () => {
        const evidence = analyze({}).evidence

        // #226 leaves packed-artifact validity to the later artifact collectors, so Doctor's own document cannot reach
        // an eligible decision by itself.
        expect(evidence.artifact).toBe('unknown')
        const planned = publish(evidence)
        expect(planned.packages[0]?.decision).toBe('unknown_artifact_facts')
        expect(planned.authorization.state).toBe('withheld')
    })

    it('hands an unavailable workspace dependency to Workspace as a closure block', () => {
        const evidence = analyze({
            dependencies: { '@fixture/lib': '^1.0.0' },
        }).evidence

        expect(publish({ ...evidence, artifact: 'valid' }).packages[0]).toEqual(
            {
                decision: 'blocked_dependency_closure',
                name: '@fixture/app',
                unresolved: ['@fixture/lib'],
                version: '1.0.0',
            },
        )
    })

    it('turns a cohort resolution into a selection requirement rather than a permission', () => {
        const evidence = analyze(
            { dependencies: { '@fixture/lib': '^1.0.0' } },
            [{ name: '@fixture/lib', state: 'included_in_cohort' }],
        ).evidence

        expect(publish({ ...evidence, artifact: 'valid' }).packages[0]).toEqual(
            {
                decision: 'blocked_closure_dependency_not_in_cohort',
                missing: ['@fixture/lib'],
                name: '@fixture/app',
                version: '1.0.0',
            },
        )
    })
})

function analyze(
    manifest: PackedPackageManifest,
    facts: Parameters<typeof analyzeWorkspaceDependencyClosure>[0]['facts'] = [
        { name: '@fixture/lib', state: 'unavailable' },
    ],
) {
    const root = mkdtempSync(path.join(tmpdir(), 'doctor-release-evidence-'))
    temporaryRoots.push(root)
    writeFileSync(
        path.join(root, 'package.json'),
        JSON.stringify({ name: '@fixture/app', version: '1.0.0', ...manifest }),
    )
    return analyzeWorkspaceDependencyClosure({
        artifactRoot: root,
        facts,
        snapshot: createSnapshot([
            { name: '@fixture/lib', path: 'packages/lib', version: '1.0.0' },
        ]),
    })
}

function createSnapshot(
    list: ReadonlyArray<WorkspacePackage>,
): WorkspaceSnapshot {
    return {
        list: [...list],
        lookup: new Map(list.map((pkg) => [pkg.name, pkg])),
        repoRoot: '/fixture',
    }
}

function publish(
    doctor: Parameters<
        typeof createReleasePublishPlan
    >[0]['candidates'][number]['doctor'],
) {
    return createReleasePublishPlan({
        candidates: [
            {
                artifact: {
                    integrity: INTEGRITY,
                    name: '@fixture/app',
                    tarball: 'releases/fixture-app-1.0.0.tgz',
                    version: '1.0.0',
                },
                doctor,
                name: '@fixture/app',
            },
        ],
        channel: 'latest',
        plan: createReleasePlan({
            packages: [
                {
                    doctor: { artifact: 'valid', dependencyClosure: 'valid' },
                    gitTag: { selected: false },
                    intent: { source: 'none' },
                    name: '@fixture/app',
                    policy: {
                        channel: 'latest',
                        decision: 'selected',
                        reason: 'Explicit release operation',
                    },
                    private: false,
                    registry: {
                        distTags: {},
                        registryUrl: 'https://registry.npmjs.org/',
                        state: 'missing',
                    },
                    version: '1.0.0',
                    versionState: { state: 'current' },
                },
            ],
        }),
        selection: ['@fixture/app'],
    })
}
