import type { WorkspacePackage, WorkspaceSnapshot } from '@snailicid3/workspace'
import { afterEach, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
    analyzeWorkspaceDependencyClosure,
    createWorkspaceDependencyEdges,
    type PackedPackageManifest,
} from './dependency-closure.js'

const temporaryRoots: Array<string> = []

afterEach(() => {
    for (const root of temporaryRoots.splice(0)) {
        rmSync(root, { force: true, recursive: true })
    }
})

describe('workspace dependency edges', () => {
    it('preserves manifest kinds and uses canonical membership instead of package scope', () => {
        const snapshot = createSnapshot([
            member('@fixture/runtime'),
            member('@fixture/private', true),
        ])
        const edges = createWorkspaceDependencyEdges(
            {
                bundleDependencies: ['@fixture/runtime'],
                dependencies: {
                    '@fixture/runtime': '^1.0.0',
                    '@snailicid3/not-a-member': '^1.0.0',
                    'zod': '^4.0.0',
                },
                devDependencies: { '@fixture/private': 'workspace:*' },
                optionalDependencies: { '@fixture/runtime': '^1.0.0' },
            },
            snapshot,
        )

        expect(edges.map(({ kind, name }) => `${kind}:${name}`)).toEqual([
            'devDependencies:@fixture/private',
            'bundleDependencies:@fixture/runtime',
            'dependencies:@fixture/runtime',
            'optionalDependencies:@fixture/runtime',
        ])
    })
})

describe('packed workspace dependency closure', () => {
    it('accepts an exact satisfying registry fact', () => {
        const artifact = createArtifact(
            {
                dependencies: { '@fixture/lib': '^1.0.0' },
            },
            { 'dist/index.js': "import '@fixture/lib'" },
        )

        expect(
            analyze(artifact, {
                facts: [
                    {
                        name: '@fixture/lib',
                        state: 'available_in_registry',
                        version: '1.2.0',
                    },
                ],
            }).evidence.closure,
        ).toEqual({
            edges: [
                {
                    name: '@fixture/lib',
                    range: '^1.0.0',
                    resolution: 'available_in_registry',
                    satisfiedBy: '1.2.0',
                },
            ],
            state: 'valid',
        })
    })

    it('does not accept a registry version that fails the packed range', () => {
        const artifact = createArtifact({
            dependencies: { '@fixture/lib': '^2.0.0' },
        })
        expect(
            analyze(artifact, {
                facts: [
                    {
                        name: '@fixture/lib',
                        state: 'available_in_registry',
                        version: '1.9.0',
                    },
                ],
            }).evidence.closure,
        ).toEqual({ state: 'unknown' })
    })

    it('accepts cohort membership supplied by Workspace', () => {
        const artifact = createArtifact({
            dependencies: { '@fixture/lib': '^1.0.0' },
        })
        expect(
            analyze(artifact, {
                facts: [{ name: '@fixture/lib', state: 'included_in_cohort' }],
            }).evidence.closure,
        ).toMatchObject({ state: 'valid' })
    })

    it('blocks an unavailable externally referenced workspace dependency', () => {
        const artifact = createArtifact(
            { dependencies: { '@fixture/private': 'workspace:*' } },
            { 'bin/cli.js': "require('@fixture/private/run')" },
        )
        const result = analyze(artifact, {
            facts: [{ name: '@fixture/private', state: 'unavailable' }],
            privateMember: true,
        })
        expect(result.evidence.closure).toMatchObject({ state: 'blocked' })
        expect(result.findings.map(({ code }) => code)).toContain(
            'WORKSPACE_DEPENDENCY_UNAVAILABLE',
        )
    })

    it('preserves unknown registry state', () => {
        const artifact = createArtifact({
            dependencies: { '@fixture/lib': '*' },
        })
        expect(
            analyze(artifact, {
                facts: [{ name: '@fixture/lib', state: 'unknown' }],
            }).evidence.closure,
        ).toEqual({ state: 'unknown' })
    })

    it('allows proven embedded private code but emits disclosure review', () => {
        const artifact = createArtifact(
            { dependencies: { '@fixture/private': '*' } },
            { 'dist/index.js': 'export const embedded = true' },
        )
        const result = analyze(artifact, {
            embeddedWorkspaceCode: [
                { files: ['dist/index.js'], name: '@fixture/private' },
            ],
            privateMember: true,
        })
        expect(result.evidence.closure).toEqual({
            edges: [
                {
                    name: '@fixture/private',
                    resolution: 'embedded_not_exposed',
                },
            ],
            state: 'valid',
        })
        expect(result.findings.map(({ code }) => code)).toEqual([
            'PRIVATE_WORKSPACE_CODE_DISCLOSURE_REVIEW',
        ])
    })

    it.each([
        ['runtime JS', 'dist/index.js', "export * from '@fixture/lib'"],
        [
            'declarations',
            'dist/index.d.ts',
            "export type { X } from '@fixture/lib'",
        ],
    ])(
        'does not call configured bundling self-contained when %s still references the dependency',
        (_label, file, contents) => {
            const artifact = createArtifact(
                {
                    bundleDependencies: ['@fixture/lib'],
                    dependencies: { '@fixture/lib': '*' },
                },
                { [file]: contents },
            )
            const result = analyze(artifact, {
                embeddedWorkspaceCode: [
                    { files: ['dist/bundle.js'], name: '@fixture/lib' },
                ],
                facts: [{ name: '@fixture/lib', state: 'unavailable' }],
            })
            expect(result.evidence.closure).toMatchObject({ state: 'blocked' })
            expect(result.findings.map(({ code }) => code)).toContain(
                'WORKSPACE_DEPENDENCY_RESIDUAL_REFERENCE',
            )
        },
    )

    it('does not make bundleDependencies configuration alone proof', () => {
        const artifact = createArtifact({
            bundleDependencies: ['@fixture/lib'],
            dependencies: { '@fixture/lib': '*' },
        })
        expect(analyze(artifact).evidence.closure).toEqual({ state: 'unknown' })
    })

    it('does not let a dev-only private dependency block runtime closure', () => {
        const artifact = createArtifact({
            devDependencies: { '@fixture/private': 'workspace:*' },
        })
        const result = analyze(artifact, {
            facts: [{ name: '@fixture/private', state: 'unavailable' }],
            privateMember: true,
        })
        expect(result.edges[0]?.kind).toBe('devDependencies')
        expect(result.evidence.closure).toEqual({ edges: [], state: 'valid' })
    })

    it('returns stable ordering independent of manifest and fact ordering', () => {
        const artifact = createArtifact({
            dependencies: { '@fixture/a': '*', '@fixture/z': '*' },
        })
        const result = analyzeWorkspaceDependencyClosure({
            artifactRoot: artifact,
            facts: [
                { name: '@fixture/z', state: 'included_in_cohort' },
                { name: '@fixture/a', state: 'unavailable' },
            ],
            snapshot: createSnapshot([
                member('@fixture/z'),
                member('@fixture/a'),
            ]),
        })
        expect(result.edges.map(({ name }) => name)).toEqual([
            '@fixture/a',
            '@fixture/z',
        ])
        expect(result.findings.map(({ dependency }) => dependency)).toEqual([
            '@fixture/a',
        ])
    })
})

function analyze(
    artifactRoot: string,
    options: {
        embeddedWorkspaceCode?: ReadonlyArray<{
            files: ReadonlyArray<string>
            name: string
        }>
        facts?: Parameters<typeof analyzeWorkspaceDependencyClosure>[0]['facts']
        privateMember?: boolean
    } = {},
) {
    return analyzeWorkspaceDependencyClosure({
        artifactRoot,
        embeddedWorkspaceCode: options.embeddedWorkspaceCode,
        facts: options.facts,
        snapshot: createSnapshot([
            member('@fixture/lib'),
            member('@fixture/private', options.privateMember),
        ]),
    })
}

function createArtifact(
    manifest: PackedPackageManifest,
    files: Readonly<Record<string, string>> = {},
): string {
    const root = mkdtempSync(path.join(tmpdir(), 'doctor-packed-artifact-'))
    temporaryRoots.push(root)
    write(
        root,
        'package.json',
        JSON.stringify({ name: '@fixture/app', version: '1.0.0', ...manifest }),
    )
    for (const [file, contents] of Object.entries(files))
        write(root, file, contents)
    return root
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

function member(name: string, privatePackage = false): WorkspacePackage {
    return {
        name,
        path: `packages/${name.split('/').at(-1) ?? 'package'}`,
        private: privatePackage,
        version: '1.0.0',
    }
}

function write(root: string, file: string, contents: string): void {
    const target = path.join(root, file)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, contents)
}
