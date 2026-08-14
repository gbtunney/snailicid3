import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { loadScopePathMatchers } from './scope-matcher-config.js'

describe('scope matcher config loading', () => {
    it('loads matcher metadata from commitlint config discovery', async () => {
        const repoRoot = mkdtempSync(path.join(tmpdir(), 'scope-config-'))

        try {
            writeFileSync(
                path.join(repoRoot, 'package.json'),
                JSON.stringify({ type: 'module' }),
            )
            writeFileSync(
                path.join(repoRoot, 'commitlint.config.ts'),
                'export default { snailicid3: { scopeMatchers: { docs: ["docs/**"] } } }',
            )

            expect(await loadScopePathMatchers(repoRoot)).toEqual({
                docs: ['docs/**'],
            })
        } finally {
            rmSync(repoRoot, { force: true, recursive: true })
        }
    })

    it('returns no overrides when no commitlint config exists', async () => {
        const parent = mkdtempSync(path.join(tmpdir(), 'scope-config-empty-'))
        const repoRoot = path.join(parent, 'nested')

        try {
            mkdirSync(repoRoot)
            // Standard scopes now come from getWorkspaceScopes, not from this loader, so absence
            // means "nothing overridden" rather than "here are the defaults".
            expect(await loadScopePathMatchers(repoRoot)).toEqual({})
        } finally {
            rmSync(parent, { force: true, recursive: true })
        }
    })

    it('rejects malformed metadata instead of falling back to defaults', async () => {
        const repoRoot = mkdtempSync(path.join(tmpdir(), 'scope-config-bad-'))

        try {
            writeFileSync(
                path.join(repoRoot, 'package.json'),
                JSON.stringify({ type: 'module' }),
            )
            writeFileSync(
                path.join(repoRoot, 'commitlint.config.ts'),
                'export default { snailicid3: { scopeMatchers: { docs: [] } } }',
            )

            // An empty array used to mean deletion; it is now an explicit error.
            await expect(loadScopePathMatchers(repoRoot)).rejects.toThrow()
        } finally {
            rmSync(repoRoot, { force: true, recursive: true })
        }
    })
})
