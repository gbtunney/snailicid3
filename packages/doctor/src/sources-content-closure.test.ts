import type { WorkspacePackage, WorkspaceSnapshot } from '@snailicid3/workspace'
import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { analyzeWorkspaceDependencyClosure } from './dependency-closure.js'
import { createIsolatedPackageConsumerResult } from './isolated-consumer-evidence.js'

describe('sourcesContent closure semantics', () => {
    it('reports disclosure without treating shipped source text as runtime embedding', () => {
        const artifactRoot = mkdtempSync(
            path.join(tmpdir(), 'doctor-sources-content-'),
        )

        try {
            write(
                artifactRoot,
                'package.json',
                JSON.stringify({
                    dependencies: { '@fixture/private': '*' },
                    name: '@fixture/app',
                    version: '1.0.0',
                }),
            )
            write(
                artifactRoot,
                'dist/index.js.map',
                JSON.stringify({
                    mappings: '',
                    names: [],
                    sources: ['../../packages/private/src/index.ts'],
                    sourcesContent: ['export const secret = 1\n'],
                    version: 3,
                }),
            )

            const result = analyzeWorkspaceDependencyClosure({
                artifactRoot,
                consumerEvidence: createIsolatedPackageConsumerResult({
                    absenceProven: ['@fixture/private'],
                    absentPackages: [],
                    checks: [
                        {
                            name: 'removed:@fixture/private',
                            state: 'passed',
                        },
                        { name: 'import:@fixture/app', state: 'passed' },
                    ],
                    removedPackages: ['@fixture/private'],
                    state: 'passed',
                }),
                facts: [{ name: '@fixture/private', state: 'unavailable' }],
                snapshot: createSnapshot([
                    {
                        name: '@fixture/app',
                        path: 'packages/app',
                        private: false,
                        version: '1.0.0',
                    },
                    {
                        name: '@fixture/private',
                        path: 'packages/private',
                        private: true,
                        version: '1.0.0',
                    },
                ]),
            })

            expect(result.provenance).toEqual([
                {
                    evidence: [
                        'sourcesContent:dist/index.js.map:../../packages/private/src/index.ts',
                    ],
                    kind: 'sourcemap',
                    name: '@fixture/private',
                    workspacePrivate: true,
                },
            ])
            expect(result.evidence.closure).toEqual({
                edges: [
                    {
                        name: '@fixture/private',
                        range: '*',
                        resolution: 'unavailable',
                    },
                ],
                state: 'blocked',
            })
            expect(result.diagnostics.map(({ code }) => code)).toContain(
                'PRIVATE_WORKSPACE_CODE_EMBEDDED',
            )
            expect(result.diagnostics.map(({ code }) => code)).toContain(
                'WORKSPACE_DEPENDENCY_UNAVAILABLE',
            )
        } finally {
            rmSync(artifactRoot, { force: true, recursive: true })
        }
    })
})

function createSnapshot(
    list: ReadonlyArray<WorkspacePackage>,
): WorkspaceSnapshot {
    return {
        list: [...list],
        lookup: new Map(list.map((pkg) => [pkg.name, pkg])),
        repoRoot: '/fixture',
    }
}

function write(root: string, file: string, contents: string): void {
    const target = path.join(root, file)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, contents)
}
