import { describe, expect, it } from 'vitest'
import { getRepoRoot } from './git.js'
import { getWorkspaceSnapshot } from './packages.js'
import {
    createRepositoryScopeClassifiers,
    resolveRepositoryScopes,
} from './repository-scopes.js'

describe('resolveRepositoryScopes', () => {
    it('returns scopes with matching file evidence', () => {
        expect(
            resolveRepositoryScopes(
                [
                    '.github/workflows/release.yml',
                    'packages/logger/src/index.ts',
                ],
                {
                    actions: ['.github/**'],
                    logger: ['packages/logger/**'],
                },
            ),
        ).toEqual({
            matches: {
                actions: ['.github/workflows/release.yml'],
                logger: ['packages/logger/src/index.ts'],
            },
            scopes: ['actions', 'logger'],
            unmatched: [],
        })
    })

    it('falls back to root when nothing matches', () => {
        expect(
            resolveRepositoryScopes(['README.md'], {
                logger: ['packages/logger/**'],
            }),
        ).toEqual({
            matches: { logger: [] },
            scopes: ['root'],
            unmatched: ['README.md'],
        })
    })
})

describe('createRepositoryScopeClassifiers', () => {
    const snapshot = getWorkspaceSnapshot(getRepoRoot({ fallbackToCwd: true }))

    it('keeps a package classifier when a custom key collides with it', () => {
        const generated = createRepositoryScopeClassifiers(snapshot)
        const packagePatterns = generated['config']

        // 'config' is also a shortened workspace package name. Overwriting instead of merging would
        // silently stop the package's own files from matching its scope, and the scope-enum side
        // hides that because a Set dedupes the name away.
        expect(packagePatterns).toBeDefined()

        const merged = createRepositoryScopeClassifiers(snapshot, {
            config: ['tools/config/**'],
        })

        for (const pattern of packagePatterns ?? []) {
            expect(merged['config']).toContain(pattern)
        }

        expect(merged['config']).toContain('tools/config/**')
    })

    it('adds a custom classifier that does not collide', () => {
        const merged = createRepositoryScopeClassifiers(snapshot, {
            'custom-area': ['tools/area/**'],
        })

        expect(merged['custom-area']).toEqual(['tools/area/**'])
        expect(merged['logger']).toBeDefined()
    })
})
