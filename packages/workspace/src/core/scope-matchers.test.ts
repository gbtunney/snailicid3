import { describe, expect, it } from 'vitest'
import {
    DEFAULT_SCOPE_PATH_MATCHERS,
    matchScopesForPath,
    resolveScopePathMatchers,
    scopeMatchersFromCommitlintConfig,
} from './scope-matchers.js'

describe('scope path matchers', () => {
    it('matches the built-in repository scopes', () => {
        expect(matchScopesForPath('.github/workflows/check.yml')).toEqual([
            'actions',
        ])
        expect(matchScopesForPath('notes/design.md')).toEqual(['notes'])
        expect(matchScopesForPath('scripts/release.ts')).toEqual(['scripts'])
    })

    it('returns every matching scope in stable order', () => {
        expect(
            matchScopesForPath('docs/api/index.md', {
                api: ['**/api/**'],
                docs: ['docs/**'],
            }),
        ).toEqual(['api', 'docs'])
    })

    it('replaces defaults, adds scopes, and disables scopes with null', () => {
        expect(
            resolveScopePathMatchers({
                actions: ['automation/**'],
                docs: ['docs/**'],
                notes: null,
            }),
        ).toEqual({
            actions: ['automation/**'],
            docs: ['docs/**'],
            scripts: ['scripts/**'],
        })
    })

    it('reads resolved metadata from commitlint configuration', () => {
        expect(
            scopeMatchersFromCommitlintConfig({
                snailicid3: { scopeMatchers: { docs: ['docs/**'] } },
            }),
        ).toEqual({ docs: ['docs/**'] })
        expect(scopeMatchersFromCommitlintConfig({})).toBe(
            DEFAULT_SCOPE_PATH_MATCHERS,
        )
    })
})
