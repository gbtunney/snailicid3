import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { findNearestPackageJson, readPackageName } from './packages.js'
import { normalizeRepoPath } from './paths.js'

describe('normalizeRepoPath', () => {
    it('converts absolute paths to repo-relative paths', () => {
        const repoRoot = path.join(tmpdir(), 'repo')
        const inputPath = path.join(repoRoot, 'packages/config/src/index.ts')

        expect(normalizeRepoPath(repoRoot, inputPath)).toBe(
            'packages/config/src/index.ts',
        )
    })

    it('removes a leading relative path marker', () => {
        expect(normalizeRepoPath('/repo', './packages/config')).toBe(
            'packages/config',
        )
    })
})

describe('findNearestPackageJson', () => {
    it('finds the closest package.json for nested files', () => {
        const repoRoot = mkdtempSync(path.join(tmpdir(), 'workspace-packages-'))
        const packageDirectory = path.join(repoRoot, 'packages/config')
        const sourceFile = path.join(packageDirectory, 'src/index.ts')

        try {
            mkdirSync(path.dirname(sourceFile), { recursive: true })
            writeFileSync(
                path.join(repoRoot, 'package.json'),
                '{"name":"root"}',
            )
            writeFileSync(
                path.join(packageDirectory, 'package.json'),
                '{"name":"@snailicid3/config"}',
            )
            writeFileSync(sourceFile, '')

            expect(findNearestPackageJson(repoRoot, sourceFile)).toBe(
                path.join(packageDirectory, 'package.json'),
            )
        } finally {
            rmSync(repoRoot, { force: true, recursive: true })
        }
    })
})

describe('readPackageName', () => {
    it('reads and trims valid package names', () => {
        const repoRoot = mkdtempSync(path.join(tmpdir(), 'workspace-package-'))
        const packageJsonPath = path.join(repoRoot, 'package.json')

        try {
            writeFileSync(
                packageJsonPath,
                JSON.stringify({ name: ' @snailicid3/config ' }),
            )

            expect(readPackageName(packageJsonPath)).toBe('@snailicid3/config')
        } finally {
            rmSync(repoRoot, { force: true, recursive: true })
        }
    })

    it('returns null for missing or invalid package names', () => {
        const repoRoot = mkdtempSync(path.join(tmpdir(), 'workspace-package-'))
        const packageJsonPath = path.join(repoRoot, 'package.json')

        try {
            writeFileSync(packageJsonPath, '{"version":"1.0.0"}')

            expect(readPackageName(packageJsonPath)).toBeNull()
            expect(readPackageName(path.join(repoRoot, 'missing.json'))).toBe(
                null,
            )
        } finally {
            rmSync(repoRoot, { force: true, recursive: true })
        }
    })
})
