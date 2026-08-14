import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
    findNearestPackageJson,
    readPackageName,
    workspacePackageManagerOutputSchema,
    workspacePackageRecordSchema,
} from './packages.js'
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

describe('workspacePackageRecordSchema', () => {
    const schema = workspacePackageRecordSchema('/repo')

    it('normalizes an absolute pnpm path to a repository-relative POSIX path', () => {
        const parsed = schema.parse({
            name: '@scope/config',
            path: '/repo/packages/config',
            version: '1.0.0',
        })

        expect(parsed.path).toBe('packages/config')
    })

    it('normalizes an npm location the same way', () => {
        expect(
            schema.parse({
                location: 'packages/logger',
                name: '@scope/logger',
                version: '0.1.0',
            }).path,
        ).toBe('packages/logger')
    })

    it('gives the repository root the path "."', () => {
        // Root is identified by this path, not by its name — a nested package may be called
        // @scope/root, and resolving a relative path would use the process directory instead.
        expect(
            schema.parse({ name: 'root', path: '/repo', version: '0.0.0' })
                .path,
        ).toBe('.')
    })

    it('rejects a record that resolves outside the repository', () => {
        const parsed = schema.safeParse({
            name: 'outside',
            path: '/elsewhere/pkg',
            version: '1.0.0',
        })

        expect(parsed.success).toBe(false)
    })

    it('rejects a record with neither path nor location', () => {
        expect(
            schema.safeParse({ name: 'nowhere', version: '1.0.0' }).success,
        ).toBe(false)
    })

    it('rejects an invalid record rather than dropping it', () => {
        // Silently discarding invalid records produced a partial list that later stages treated as
        // complete.
        expect(
            schema.safeParse({
                name: 'Not Valid',
                path: '/repo/pkg',
                version: '1.0.0',
            }).success,
        ).toBe(false)
    })
})

describe('workspacePackageManagerOutputSchema', () => {
    it('parses a complete listing', () => {
        const parsed = workspacePackageManagerOutputSchema('/repo').safeParse(
            JSON.stringify([
                { name: 'a', path: '/repo/a', version: '1.0.0' },
                { location: 'b', name: 'b', version: '2.0.0' },
            ]),
        )

        expect(parsed.success).toBe(true)
        expect(parsed.success && parsed.data.map((pkg) => pkg.path)).toEqual([
            'a',
            'b',
        ])
    })

    it('fails the whole listing when one record is invalid', () => {
        const parsed = workspacePackageManagerOutputSchema('/repo').safeParse(
            JSON.stringify([
                { name: 'good', path: '/repo/good', version: '1.0.0' },
                { name: 'bad', path: '/repo/bad' },
            ]),
        )

        expect(parsed.success).toBe(false)
    })

    it('reports malformed JSON rather than yielding an empty workspace', () => {
        expect(
            workspacePackageManagerOutputSchema('/repo').safeParse('{ not json')
                .success,
        ).toBe(false)
    })
})
