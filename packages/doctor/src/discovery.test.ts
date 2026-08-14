import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
    discoverPackageRoots,
    discoverPackageRootsFromFilesystem,
} from './discovery.js'
import { runDoctor } from './doctor.js'

describe('package discovery', () => {
    it('finds a single package and nested workspace packages without Nx', () => {
        const root = createWorkspace()

        try {
            expect(
                discoverPackageRoots(root, { usePackageManager: false }),
            ).toEqual([root, path.join(root, 'packages/one')])
        } finally {
            rmSync(root, { force: true, recursive: true })
        }
    })

    it('does not discover package manifests inside ignored artifact directories', () => {
        const root = createWorkspace()

        try {
            writeManifest(
                path.join(root, 'node_modules/hidden'),
                '@fixture/hidden',
            )
            writeManifest(path.join(root, 'dist/hidden'), '@fixture/dist')

            expect(discoverPackageRootsFromFilesystem(root)).toEqual([
                root,
                path.join(root, 'packages/one'),
            ])
        } finally {
            rmSync(root, { force: true, recursive: true })
        }
    })

    it('filters by package name and reports findings without changing files', () => {
        const root = createWorkspace()

        try {
            const before = discoverPackageRootsFromFilesystem(root)
            const report = runDoctor({
                discovery: { usePackageManager: false },
                packageNames: ['@fixture/one'],
                root,
            })
            const after = discoverPackageRootsFromFilesystem(root)

            expect(
                report.packages.map(({ packageName }) => packageName),
            ).toEqual(['@fixture/one'])
            expect(report.summary.findings).toBe(1)
            expect(report.summary.unregisteredFindings).toBe(1)
            expect(after).toEqual(before)
        } finally {
            rmSync(root, { force: true, recursive: true })
        }
    })
})

function createWorkspace(): string {
    const root = mkdtempSync(path.join(tmpdir(), 'snail-doctor-workspace-'))
    writeManifest(root, '@fixture/root')
    writeManifest(path.join(root, 'packages/one'), '@fixture/one', {
        exports: './dist/index.js',
    })
    return root
}

function writeManifest(
    directory: string,
    name: string,
    extra: Record<string, unknown> = {},
): void {
    mkdirSync(directory, { recursive: true })
    writeFileSync(
        path.join(directory, 'package.json'),
        JSON.stringify({ name, version: '1.0.0', ...extra }),
    )
}
