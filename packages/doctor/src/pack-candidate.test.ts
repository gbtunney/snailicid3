import { afterEach, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
    createPackCandidate,
    detectSourcePackageManager,
} from './pack-candidate.js'

const temporaryRoots: Array<string> = []

afterEach(() => {
    for (const root of temporaryRoots.splice(0)) {
        rmSync(root, { force: true, recursive: true })
    }
})

describe('pack candidate preparation', () => {
    it('leaves the inspected source package byte-for-byte unchanged', () => {
        const packageRoot = createStandalonePackage()
        const before = snapshotTree(packageRoot)

        const candidate = createPackCandidate({ packageRoot })
        try {
            expect(snapshotTree(packageRoot)).toEqual(before)
        } finally {
            candidate.dispose()
        }
        // Packing is read-only in both directions: disposing the candidate must not have touched the source either.
        expect(snapshotTree(packageRoot)).toEqual(before)
    }, 120_000)

    it('keeps the package manager cache out of the package being inspected', () => {
        const packageRoot = createStandalonePackage()

        const candidate = createPackCandidate({ packageRoot })
        try {
            // The cache directory is the specific regression: a runner that derives it from the working directory
            // writes `.npm-cache` into the very tree Doctor promises not to modify.
            expect(readdirSync(packageRoot)).not.toContain('.npm-cache')
            expect(snapshotTree(packageRoot).map(([file]) => file)).toEqual([
                'dist/index.js',
                'package.json',
            ])
        } finally {
            candidate.dispose()
        }
    }, 120_000)

    it('materializes workspace ranges into publishable versions', () => {
        const workspace = createInstalledWorkspace()

        const candidate = createPackCandidate({
            packageRoot: path.join(workspace, 'pkgs', 'app'),
        })
        try {
            expect(candidate.origin).toEqual({
                kind: 'packed',
                packageManager: 'pnpm',
            })
            // The whole point of the collector is to judge the artifact that gets published, and `workspace:*` is a
            // specifier no registry consumer could ever install.
            expect(packedDependencies(candidate.artifactRoot)).toEqual({
                '@fixture/lib': '4.5.6',
            })
        } finally {
            candidate.dispose()
        }
    }, 120_000)

    it('leaves the workspace range unresolved when packed with npm', () => {
        const workspace = createInstalledWorkspace()

        const candidate = createPackCandidate({
            packageManager: 'npm',
            packageRoot: path.join(workspace, 'pkgs', 'app'),
        })
        try {
            // Characterizing the reason pnpm is the default rather than a preference: npm performs no workspace
            // protocol replacement, so validating its output would describe a package that is never published.
            expect(packedDependencies(candidate.artifactRoot)).toEqual({
                '@fixture/lib': 'workspace:*',
            })
        } finally {
            candidate.dispose()
        }
    }, 120_000)

    it('refuses to pack a workspace package whose dependencies are not installed', () => {
        const workspace = createWorkspaceSource()

        // Pnpm cannot resolve `workspace:` without an install, and reports that as JSON on stdout with an empty
        // stderr. Surfacing its message is what keeps the failure actionable instead of "command exited 1".
        expect(() =>
            createPackCandidate({
                packageRoot: path.join(workspace, 'pkgs', 'app'),
            }),
        ).toThrow(/workspace protocol/iu)
    }, 120_000)

    it('reports an adopted tarball as adopted rather than packed', () => {
        const packageRoot = createStandalonePackage()
        const packed = createPackCandidate({ packageRoot })
        const adoptedFrom = path.join(
            mkdtempSync(path.join(tmpdir(), 'doctor-adopt-')),
            'artifact.tgz',
        )
        temporaryRoots.push(path.dirname(adoptedFrom))
        writeFileSync(adoptedFrom, readFileSync(packed.tarball))
        packed.dispose()

        const adopted = createPackCandidate({ tarball: adoptedFrom })
        try {
            expect(adopted.origin).toEqual({ kind: 'adopted' })
            expect(adopted.files).toEqual(['dist/index.js', 'package.json'])
        } finally {
            adopted.dispose()
        }
    }, 120_000)
})

describe('package manager detection', () => {
    it('reads an explicit packageManager declaration', () => {
        const workspace = createWorkspaceSource()

        expect(
            detectSourcePackageManager(path.join(workspace, 'pkgs', 'app')),
        ).toBe('pnpm')
    })

    it('identifies an npm repository from its lockfile', () => {
        const root = createRepository({ 'package-lock.json': '{}' })

        // An npm repository that never declared `packageManager` must not be packed as though it were pnpm.
        expect(detectSourcePackageManager(path.join(root, 'pkg'))).toBe('npm')
    })

    it('identifies a pnpm repository from its lockfile', () => {
        const root = createRepository({
            'pnpm-lock.yaml': "lockfileVersion: '9.0'\n",
        })

        expect(detectSourcePackageManager(path.join(root, 'pkg'))).toBe('pnpm')
    })

    it('identifies a pnpm workspace before an install has produced a lockfile', () => {
        const root = createRepository({
            'pnpm-workspace.yaml': "packages:\n  - 'pkg'\n",
        })

        expect(detectSourcePackageManager(path.join(root, 'pkg'))).toBe('pnpm')
    })

    it('prefers the nearest evidence to a more distant declaration', () => {
        const root = createRepository({ 'package-lock.json': '{}' })
        write(
            root,
            'package.json',
            JSON.stringify({
                name: '@fixture/repo',
                packageManager: 'pnpm@10.30.2',
                private: true,
                version: '0.0.0',
            }),
        )
        write(root, 'pkg/package-lock.json', '{}')

        // The package's own lockfile answers before the repository root is consulted.
        expect(detectSourcePackageManager(path.join(root, 'pkg'))).toBe('npm')
    })

    it('refuses to guess when nothing names a manager', () => {
        const bare = mkdtempSync(path.join(tmpdir(), 'doctor-pack-bare-'))
        temporaryRoots.push(bare)
        write(bare, 'package.json', JSON.stringify({ name: '@fixture/bare' }))

        // Guessing here is the failure mode: it would validate a manifest the repository will never publish.
        expect(() => detectSourcePackageManager(bare)).toThrow(
            /Pass packageManager explicitly/u,
        )
    })

    it('refuses to guess when two lockfiles disagree', () => {
        const root = createRepository({
            'package-lock.json': '{}',
            'pnpm-lock.yaml': "lockfileVersion: '9.0'\n",
        })

        expect(() =>
            detectSourcePackageManager(path.join(root, 'pkg')),
        ).toThrow(/Ambiguous package manager/u)
    })
})

function createInstalledWorkspace(): string {
    const workspace = createWorkspaceSource()
    const install = spawnSync(
        'pnpm',
        ['install', '--ignore-scripts', '--no-frozen-lockfile', '--silent'],
        { cwd: workspace, encoding: 'utf8' },
    )
    if (install.status !== 0) {
        throw new Error(`fixture install failed: ${install.stderr}`)
    }
    return workspace
}

/** A repository root carrying the given evidence files, with one package beneath it. */
function createRepository(files: Record<string, string>): string {
    const root = mkdtempSync(path.join(tmpdir(), 'doctor-pack-repo-'))
    temporaryRoots.push(root)
    for (const [file, contents] of Object.entries(files)) {
        write(root, file, contents)
    }
    write(
        root,
        'pkg/package.json',
        JSON.stringify({ name: '@fixture/pkg', version: '1.0.0' }),
    )
    return root
}

function createStandalonePackage(): string {
    const root = mkdtempSync(path.join(tmpdir(), 'doctor-pack-source-'))
    temporaryRoots.push(root)
    write(
        root,
        'package.json',
        JSON.stringify({
            exports: { '.': './dist/index.js' },
            files: ['dist'],
            license: 'MIT',
            name: '@fixture/standalone',
            packageManager: 'pnpm@10.30.2',
            type: 'module',
            version: '1.0.0',
        }),
    )
    write(root, 'dist/index.js', 'export const value = 42\n')
    return root
}

function createWorkspaceSource(): string {
    const root = mkdtempSync(path.join(tmpdir(), 'doctor-pack-workspace-'))
    temporaryRoots.push(root)
    write(root, 'pnpm-workspace.yaml', "packages:\n  - 'pkgs/*'\n")
    write(
        root,
        'package.json',
        JSON.stringify({
            name: '@fixture/root',
            packageManager: 'pnpm@10.30.2',
            private: true,
            version: '0.0.0',
        }),
    )
    write(
        root,
        'pkgs/lib/package.json',
        JSON.stringify({
            exports: { '.': './index.js' },
            license: 'MIT',
            name: '@fixture/lib',
            type: 'module',
            version: '4.5.6',
        }),
    )
    write(root, 'pkgs/lib/index.js', 'export const lib = 1\n')
    write(
        root,
        'pkgs/app/package.json',
        JSON.stringify({
            dependencies: { '@fixture/lib': 'workspace:*' },
            exports: { '.': './index.js' },
            license: 'MIT',
            name: '@fixture/app',
            type: 'module',
            version: '0.1.0',
        }),
    )
    write(root, 'pkgs/app/index.js', 'export const app = 1\n')
    return root
}

function packedDependencies(
    artifactRoot: string,
): Record<string, string> | undefined {
    const manifest: unknown = JSON.parse(
        readFileSync(path.join(artifactRoot, 'package.json'), 'utf8'),
    )
    return (manifest as { dependencies?: Record<string, string> }).dependencies
}

/** Every file under a tree with a digest of its contents, so any write, rewrite or removal shows up. */
function snapshotTree(root: string): ReadonlyArray<[string, string]> {
    const files: Array<[string, string]> = []
    const visit = (directory: string): void => {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            const absolute = path.join(directory, entry.name)
            if (entry.isDirectory()) {
                visit(absolute)
                continue
            }
            files.push([
                path.relative(root, absolute).split(path.sep).join('/'),
                createHash('sha256')
                    .update(readFileSync(absolute))
                    .digest('hex'),
            ])
        }
    }
    visit(root)
    return files.toSorted(([left], [right]) => left.localeCompare(right))
}

function write(root: string, file: string, contents: string): void {
    const target = path.join(root, file)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, contents)
}
