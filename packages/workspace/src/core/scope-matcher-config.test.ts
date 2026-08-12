import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { loadScopePathMatchers } from './scope-matcher-config.js'
import { DEFAULT_SCOPE_PATH_MATCHERS } from './scope-matchers.js'

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

    it('uses defaults when no commitlint config exists', async () => {
        const parent = mkdtempSync(path.join(tmpdir(), 'scope-config-empty-'))
        const repoRoot = path.join(parent, 'nested')

        try {
            mkdirSync(repoRoot)
            expect(await loadScopePathMatchers(repoRoot)).toEqual(
                DEFAULT_SCOPE_PATH_MATCHERS,
            )
        } finally {
            rmSync(parent, { force: true, recursive: true })
        }
    })
})
