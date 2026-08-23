import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { applyChangesetFileScopes } from './commit-scope.js'
import type { WorkspaceSnapshot } from './packages.js'

function snapshot(
    packages: Array<{ name: string; path: string }>,
): WorkspaceSnapshot {
    const list = packages.map((pkg) => ({ ...pkg, version: '1.0.0' }))

    return {
        list,
        lookup: new Map(list.map((pkg) => [pkg.name, pkg])),
        repoRoot: '/repo',
    }
}

/** Run a callback against a throwaway repo root, cleaning it up afterward. */
const withTempRepo = (run: (repoRoot: string) => void): void => {
    const repoRoot = mkdtempSync(path.join(tmpdir(), 'commit-scope-'))
    try {
        run(repoRoot)
    } finally {
        rmSync(repoRoot, { force: true, recursive: true })
    }
}

describe('applyChangesetFileScopes', () => {
    it('recovers scope from an unmatched changeset file (issue #201)', () => {
        withTempRepo((repoRoot) => {
            mkdirSync(path.join(repoRoot, '.changeset'), { recursive: true })
            const file = '.changeset/wacky-walker.md'
            writeFileSync(
                path.join(repoRoot, file),
                '---\n"@scope/config": minor\n---\n\nSummary\n',
            )

            const resolution = applyChangesetFileScopes(
                repoRoot,
                { matches: {}, scopes: ['root'], unmatched: [file] },
                snapshot([{ name: '@scope/config', path: 'packages/config' }]),
                false,
            )

            expect(resolution.scopes).toEqual(['config'])
            expect(resolution.matches['config']).toEqual([file])
            expect(resolution.unmatched).toEqual([])
        })
    })

    it('leaves an already-resolved result untouched', () => {
        const resolution = applyChangesetFileScopes(
            '/repo',
            {
                matches: { config: ['packages/config/x.ts'] },
                scopes: ['config'],
                unmatched: [],
            },
            snapshot([]),
            false,
        )

        expect(resolution).toEqual({
            matches: { config: ['packages/config/x.ts'] },
            scopes: ['config'],
            unmatched: [],
        })
    })

    it('leaves an unmatched non-changeset file alone', () => {
        const resolution = applyChangesetFileScopes(
            '/repo',
            { matches: {}, scopes: ['root'], unmatched: ['README.md'] },
            snapshot([]),
            false,
        )

        expect(resolution.unmatched).toEqual(['README.md'])
        expect(resolution.scopes).toEqual(['root'])
    })

    it('falls back to root when the changeset file has no releases', () => {
        withTempRepo((repoRoot) => {
            mkdirSync(path.join(repoRoot, '.changeset'), { recursive: true })
            const file = '.changeset/empty.md'
            writeFileSync(path.join(repoRoot, file), 'not a changeset\n')

            const resolution = applyChangesetFileScopes(
                repoRoot,
                { matches: {}, scopes: ['root'], unmatched: [file] },
                snapshot([]),
                false,
            )

            expect(resolution.scopes).toEqual(['root'])
            expect(resolution.matches['root']).toEqual([file])
            expect(resolution.unmatched).toEqual([])
        })
    })

    it('keeps the full package name when keepPrefix is set', () => {
        withTempRepo((repoRoot) => {
            mkdirSync(path.join(repoRoot, '.changeset'), { recursive: true })
            const file = '.changeset/wacky-walker.md'
            writeFileSync(
                path.join(repoRoot, file),
                '---\n"@scope/config": minor\n---\n\nSummary\n',
            )

            const resolution = applyChangesetFileScopes(
                repoRoot,
                { matches: {}, scopes: ['root'], unmatched: [file] },
                snapshot([{ name: '@scope/config', path: 'packages/config' }]),
                true,
            )

            expect(resolution.scopes).toEqual(['@scope/config'])
        })
    })
})
