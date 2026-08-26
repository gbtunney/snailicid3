import type { WorkspacePackage, WorkspaceSnapshot } from '@snailicid3/workspace'
import { afterEach, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { collectEmbeddedWorkspaceCodeProvenance } from './embedded-provenance.js'

const temporaryRoots: Array<string> = []

/** Long enough to clear the digest threshold that keeps trivial generated files from colliding. */
const VENDORED_SOURCE = `export const compute = (value) => {\n${'    // vendored implementation detail\n'.repeat(4)}    return value * 2\n}\n`

afterEach(() => {
    for (const root of temporaryRoots.splice(0)) {
        rmSync(root, { force: true, recursive: true })
    }
})

describe('embedded workspace code provenance', () => {
    it('attributes emitted code to the workspace location its sourcemap names', () => {
        const artifact = createArtifact({
            'dist/index.js': 'export const answer = 42',
            'dist/index.js.map': sourceMap([
                '../../packages/private/src/index.ts',
            ]),
        })

        expect(
            collect(artifact, [member('@fixture/private', { private: true })]),
        ).toEqual([
            {
                evidence: [
                    'sourcemap:dist/index.js.map:../../packages/private/src/index.ts',
                ],
                kind: 'sourcemap',
                name: '@fixture/private',
                workspacePrivate: true,
            },
        ])
    })

    it('attributes a sourcemap that names the dependency through node_modules', () => {
        const artifact = createArtifact({
            'dist/index.js.map': sourceMap([
                '../node_modules/@fixture/private/dist/index.js',
            ]),
        })

        expect(
            collect(artifact, [member('@fixture/private')]).map(
                ({ kind, name }) => `${kind}:${name}`,
            ),
        ).toEqual(['sourcemap:@fixture/private'])
    })

    it('reads an inline base64 sourcemap out of the emitted file', () => {
        const payload = Buffer.from(
            sourceMap(['webpack://app/./packages/private/src/index.ts']),
        ).toString('base64')
        const artifact = createArtifact({
            'dist/index.js': `export const answer = 42\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${payload}`,
        })

        expect(
            collect(artifact, [member('@fixture/private')]).map(
                ({ kind }) => kind,
            ),
        ).toEqual(['sourcemap'])
    })

    it('does not attribute a workspace location that only shares a name prefix', () => {
        const artifact = createArtifact({
            'dist/index.js.map': sourceMap([
                '../../packages/private-extra/src/index.ts',
            ]),
        })

        expect(collect(artifact, [member('@fixture/private')])).toEqual([])
    })

    it('never treats the analyzed package own sources as an embedded dependency', () => {
        const artifact = createArtifact({
            'dist/index.js.map': sourceMap(['../../packages/app/src/index.ts']),
        })

        expect(
            collectEmbeddedWorkspaceCodeProvenance({
                artifactRoot: artifact,
                packageName: '@fixture/app',
                snapshot: createSnapshot([
                    {
                        name: '@fixture/app',
                        path: 'packages/app',
                        version: '1.0.0',
                    },
                ]),
            }),
        ).toEqual([])
    })

    it('attributes a bundled module by its shipped manifest rather than its directory', () => {
        const artifact = createArtifact({
            'node_modules/vendor/package.json': JSON.stringify({
                name: '@fixture/private',
                version: '1.0.0',
            }),
        })

        expect(
            collect(artifact, [member('@fixture/private', { private: true })]),
        ).toEqual([
            {
                evidence: ['bundled:node_modules/vendor/package.json'],
                kind: 'bundled_module',
                name: '@fixture/private',
                workspacePrivate: true,
            },
        ])
    })

    it('attributes a verbatim copy of a checked-out workspace file by content', () => {
        const repoRoot = createRepo({
            'packages/private/dist/index.js': VENDORED_SOURCE,
        })
        const artifact = createArtifact({
            'dist/vendor/compute.js': VENDORED_SOURCE,
        })

        expect(
            collectEmbeddedWorkspaceCodeProvenance({
                artifactRoot: artifact,
                packageName: '@fixture/app',
                snapshot: createSnapshot(
                    [member('@fixture/private', { private: true })],
                    repoRoot,
                ),
            }),
        ).toEqual([
            {
                evidence: [
                    'content:dist/vendor/compute.js=packages/private/dist/index.js',
                ],
                kind: 'vendored_content',
                name: '@fixture/private',
                workspacePrivate: true,
            },
        ])
    })

    it('does not call a short identical generated file a vendored copy', () => {
        const repoRoot = createRepo({
            'packages/private/dist/index.js': 'export {}\n',
        })
        const artifact = createArtifact({ 'dist/index.js': 'export {}\n' })

        expect(
            collectEmbeddedWorkspaceCodeProvenance({
                artifactRoot: artifact,
                packageName: '@fixture/app',
                snapshot: createSnapshot(
                    [member('@fixture/private')],
                    repoRoot,
                ),
            }),
        ).toEqual([])
    })

    it('reports absence of provenance rather than proof that nothing is embedded', () => {
        const artifact = createArtifact({
            'dist/index.js': 'export const answer = 42',
        })

        expect(collect(artifact, [member('@fixture/private')])).toEqual([])
    })
})

function collect(
    artifactRoot: string,
    members: ReadonlyArray<WorkspacePackage>,
) {
    return collectEmbeddedWorkspaceCodeProvenance({
        artifactRoot,
        packageName: '@fixture/app',
        snapshot: createSnapshot(members),
    })
}

function createArtifact(files: Readonly<Record<string, string>>): string {
    const root = mkdtempSync(path.join(tmpdir(), 'doctor-provenance-'))
    temporaryRoots.push(root)
    write(
        root,
        'package.json',
        JSON.stringify({ name: '@fixture/app', version: '1.0.0' }),
    )
    for (const [file, contents] of Object.entries(files))
        write(root, file, contents)
    return root
}

function createRepo(files: Readonly<Record<string, string>>): string {
    const root = mkdtempSync(path.join(tmpdir(), 'doctor-provenance-repo-'))
    temporaryRoots.push(root)
    for (const [file, contents] of Object.entries(files))
        write(root, file, contents)
    return root
}

function createSnapshot(
    list: ReadonlyArray<WorkspacePackage>,
    repoRoot = '/fixture',
): WorkspaceSnapshot {
    return {
        list: [...list],
        lookup: new Map(list.map((pkg) => [pkg.name, pkg])),
        repoRoot,
    }
}

function member(
    name: string,
    options: { private?: boolean } = {},
): WorkspacePackage {
    return {
        name,
        path: `packages/${name.split('/').at(-1) ?? 'package'}`,
        private: options.private === true,
        version: '1.0.0',
    }
}

function sourceMap(sources: ReadonlyArray<string>): string {
    return JSON.stringify({
        mappings: '',
        names: [],
        sources: [...sources],
        version: 3,
    })
}

function write(root: string, file: string, contents: string): void {
    const target = path.join(root, file)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, contents)
}
