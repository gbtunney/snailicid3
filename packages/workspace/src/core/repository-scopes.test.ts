import { describe, expect, it } from 'vitest'
import { resolveRepositoryScopes } from './repository-scopes.js'

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
