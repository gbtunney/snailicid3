import type { WorkspacePackage, WorkspaceSnapshot } from '@snailicid3/workspace'
import { afterEach, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { collectEmbeddedWorkspaceCodeProvenance } from './embedded-provenance.js'

const temporaryRoots: Array<string> = []

/** Long enough to qualify as vendored-content evidence. */
const IDENTICAL_SOURCE = `export const compute = (value) => {\n${'    const adjusted = value + 1\n'.repeat(5)}    return adjusted * 2\n}\n`

afterEach(() => {
    for (const root of temporaryRoots.splice(0)) {
        rmSync(root, { force: true, recursive: true })
    }
})

describe('vendored workspace provenance ownership', () => {
    it('does not attribute identical bytes shared by public and private workspace members', () => {
        const repoRoot = createRoot('doctor-provenance-repo-')
        write(repoRoot, 'packages/public/dist/index.js', IDENTICAL_SOURCE)
        write(repoRoot, 'packages/private/dist/index.js', IDENTICAL_SOURCE)

        const artifactRoot = createRoot('doctor-provenance-artifact-')
        write(artifactRoot, 'dist/vendor/compute.js', IDENTICAL_SOURCE)

        expect(
            collectEmbeddedWorkspaceCodeProvenance({
                artifactRoot,
                packageName: '@fixture/app',
                snapshot: snapshot(
                    [
                        member('@fixture/public', false),
                        member('@fixture/private', true),
                    ],
                    repoRoot,
                ),
            }),
        ).toEqual([])
    })

    it('still attributes a digest when duplicate source files belong to one workspace member', () => {
        const repoRoot = createRoot('doctor-provenance-repo-')
        write(repoRoot, 'packages/private/dist/first.js', IDENTICAL_SOURCE)
        write(repoRoot, 'packages/private/dist/second.js', IDENTICAL_SOURCE)

        const artifactRoot = createRoot('doctor-provenance-artifact-')
        write(artifactRoot, 'dist/vendor/compute.js', IDENTICAL_SOURCE)

        expect(
            collectEmbeddedWorkspaceCodeProvenance({
                artifactRoot,
                packageName: '@fixture/app',
                snapshot: snapshot(
                    [member('@fixture/private', true)],
                    repoRoot,
                ),
            }),
        ).toEqual([
            {
                evidence: [
                    'content:dist/vendor/compute.js=packages/private/dist/first.js',
                    'content:dist/vendor/compute.js=packages/private/dist/second.js',
                ],
                kind: 'vendored_content',
                name: '@fixture/private',
                workspacePrivate: true,
            },
        ])
    })
})

function createRoot(prefix: string): string {
    const root = mkdtempSync(path.join(tmpdir(), prefix))
    temporaryRoots.push(root)
    return root
}

function member(name: string, workspacePrivate: boolean): WorkspacePackage {
    return {
        name,
        path: `packages/${name.split('/').at(-1) ?? 'package'}`,
        private: workspacePrivate,
        version: '1.0.0',
    }
}

function snapshot(
    list: ReadonlyArray<WorkspacePackage>,
    repoRoot: string,
): WorkspaceSnapshot {
    return {
        list: [...list],
        lookup: new Map(list.map((workspacePackage) => [workspacePackage.name, workspacePackage])),
        repoRoot,
    }
}

function write(root: string, file: string, contents: string): void {
    const target = path.join(root, file)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, contents)
}
