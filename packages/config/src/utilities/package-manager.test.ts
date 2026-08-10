import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
    getPackageBinaryCommand,
    getPackageManager,
    getPackageScriptCommand,
    resolvePackageManager,
} from './package-manager.js'

function withManifest(
    manifest: object,
    assertion: (repoRoot: string) => void,
): void {
    const repoRoot = mkdtempSync(path.join(tmpdir(), 'package-manager-'))

    try {
        writeFileSync(
            path.join(repoRoot, 'package.json'),
            JSON.stringify(manifest),
        )
        assertion(repoRoot)
    } finally {
        rmSync(repoRoot, { force: true, recursive: true })
    }
}

describe('package manager utilities', () => {
    it('prefers the environment override', () => {
        withManifest({ packageManager: 'pnpm@10.0.0' }, (repoRoot) => {
            expect(
                getPackageManager(repoRoot, { PACKAGE_MANAGER: 'npm' }),
            ).toBe('npm')
        })
    })

    it('reads npm and pnpm packageManager declarations', () => {
        withManifest({ packageManager: 'npm@11.0.0' }, (repoRoot) => {
            expect(getPackageManager(repoRoot, {})).toBe('npm')
        })
        withManifest({ packageManager: 'pnpm@10.0.0' }, (repoRoot) => {
            expect(getPackageManager(repoRoot, {})).toBe('pnpm')
        })
    })

    it('reports the source of the resolved package manager', () => {
        withManifest({ packageManager: 'npm@11.0.0' }, (repoRoot) => {
            expect(resolvePackageManager(repoRoot, {})).toEqual({
                packageManager: 'npm',
                source: 'package.json',
            })
            expect(
                resolvePackageManager(repoRoot, { PACKAGE_MANAGER: 'pnpm' }),
            ).toEqual({
                packageManager: 'pnpm',
                source: 'environment',
            })
        })
    })

    it('retains pnpm as the fallback', () => {
        withManifest({}, (repoRoot) => {
            expect(getPackageManager(repoRoot, {})).toBe('pnpm')
        })
    })

    it('rejects unsupported declared managers', () => {
        withManifest({ packageManager: 'yarn@4.0.0' }, (repoRoot) => {
            expect(() => getPackageManager(repoRoot, {})).toThrow(
                'Unsupported package manager: yarn',
            )
        })
    })

    it('constructs npm and pnpm binary commands', () => {
        expect(
            getPackageBinaryCommand('npm', 'commitlint', ['--edit', 'x']),
        ).toEqual({
            args: ['exec', '--', 'commitlint', '--edit', 'x'],
            command: 'npm',
        })
        expect(
            getPackageBinaryCommand('pnpm', 'commitlint', ['--edit', 'x']),
        ).toEqual({
            args: ['exec', 'commitlint', '--edit', 'x'],
            command: 'pnpm',
        })
    })

    it('adds a script argument separator only when needed', () => {
        expect(getPackageScriptCommand('npm', 'test')).toEqual({
            args: ['run', 'test'],
            command: 'npm',
        })
        expect(getPackageScriptCommand('pnpm', 'test', ['--watch'])).toEqual({
            args: ['run', 'test', '--', '--watch'],
            command: 'pnpm',
        })
    })
})
