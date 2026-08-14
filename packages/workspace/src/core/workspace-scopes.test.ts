import { describe, expect, it } from 'vitest'
import type { WorkspaceSnapshot } from './packages.js'
import {
    getWorkspaceScopes,
    workspaceScopeOverridesSchema,
} from './workspace-scopes.js'

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

const base = snapshot([
    { name: '@scope/config', path: 'packages/config' },
    { name: '@scope/logger', path: 'packages/logger' },
    { name: '@scope/root', path: '.' },
])

describe('getWorkspaceScopes', () => {
    it('derives names and classifiers from one model', () => {
        const resolved = getWorkspaceScopes({ snapshot: base })

        expect(resolved.names).toContain('config')
        expect(resolved.names).toContain('logger')
        expect(resolved.classifiers['config']).toEqual(['packages/config/**'])

        // Commitlint's enum and the classifiers now come from the same place, so they cannot drift.
        for (const scope of Object.keys(resolved.classifiers)) {
            expect(resolved.names).toContain(scope)
        }
    })

    it('excludes the root package by path, not by name', () => {
        // '@scope/root' sits at '.', so it must not produce a './**' classifier matching everything.
        expect(
            getWorkspaceScopes({ snapshot: base }).classifiers['root'],
        ).toBeUndefined()
    })

    it('keeps root as a valid manual scope', () => {
        const resolved = getWorkspaceScopes({ snapshot: base })

        expect(resolved.names).toContain('root')
        expect(resolved.definitions['root']).toBe(true)
    })

    it('includes the standard repository scopes', () => {
        const resolved = getWorkspaceScopes({ snapshot: base })

        expect(resolved.classifiers['actions']).toContain(
            '.github/workflows/**',
        )
        expect(resolved.classifiers['notes']).toEqual(['notes/**'])
    })

    it('unions an override that collides with a package scope', () => {
        // Replacing here would silently stop packages/config/** matching its own scope.
        const resolved = getWorkspaceScopes({
            overrides: { config: ['tools/config/**'] },
            snapshot: base,
        })

        expect(resolved.classifiers['config']).toEqual([
            'packages/config/**',
            'tools/config/**',
        ])
        expect(resolved.sources['config']).toEqual(['override', 'package'])
    })

    it('records a single source when nothing collides', () => {
        expect(
            getWorkspaceScopes({ snapshot: base }).sources['logger'],
        ).toEqual(['package'])
    })

    it('disables a scope with false', () => {
        const resolved = getWorkspaceScopes({
            overrides: { notes: false },
            snapshot: base,
        })

        expect(resolved.names).not.toContain('notes')
        expect(resolved.classifiers['notes']).toBeUndefined()
    })

    it('adds a manual scope with true', () => {
        const resolved = getWorkspaceScopes({
            overrides: { deps: true },
            snapshot: base,
        })

        // Valid for Commitlint, but nothing classifies into it automatically.
        expect(resolved.names).toContain('deps')
        expect(resolved.definitions['deps']).toBe(true)
        expect(resolved.classifiers['deps']).toBeUndefined()
    })

    it('inherits a definition when an override is undefined', () => {
        const resolved = getWorkspaceScopes({
            overrides: { config: undefined },
            snapshot: base,
        })

        expect(resolved.classifiers['config']).toEqual(['packages/config/**'])
    })

    it('keeps full names when keepPrefix is set', () => {
        const resolved = getWorkspaceScopes({
            keepPrefix: true,
            snapshot: base,
        })

        expect(resolved.names).toContain('@scope/config')
    })

    it('unions two packages that shorten to the same scope', () => {
        const resolved = getWorkspaceScopes({
            snapshot: snapshot([
                { name: '@a/shared', path: 'packages/a-shared' },
                { name: '@b/shared', path: 'packages/b-shared' },
            ]),
        })

        expect(resolved.classifiers['shared']).toEqual([
            'packages/a-shared/**',
            'packages/b-shared/**',
        ])
    })
})

describe('workspaceScopeOverridesSchema', () => {
    it('rejects an empty array', () => {
        // `[]` and `false` used to mean the same thing; `true` is now how a matcherless scope is said.
        expect(workspaceScopeOverridesSchema.safeParse({ a: [] }).success).toBe(
            false,
        )
    })

    it('rejects null, which the old resolver treated as deletion', () => {
        expect(
            workspaceScopeOverridesSchema.safeParse({ a: null }).success,
        ).toBe(false)
    })

    it('rejects an empty scope name', () => {
        expect(
            workspaceScopeOverridesSchema.safeParse({ '  ': true }).success,
        ).toBe(false)
    })

    it('accepts booleans and non-empty pattern arrays', () => {
        expect(
            workspaceScopeOverridesSchema.safeParse({
                a: true,
                b: false,
                c: ['x/**'],
            }).success,
        ).toBe(true)
    })
})
