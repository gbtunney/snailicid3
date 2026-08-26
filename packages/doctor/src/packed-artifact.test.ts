import type { WorkspacePackage, WorkspaceSnapshot } from '@snailicid3/workspace'
import { afterEach, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import {
    mkdirSync,
    mkdtempSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
    analyzePackedTarballWorkspaceDependencyClosure,
    runIsolatedPackageConsumer,
} from './packed-artifact.js'

const temporaryRoots: Array<string> = []

afterEach(() => {
    for (const root of temporaryRoots.splice(0)) {
        rmSync(root, { force: true, recursive: true })
    }
})

describe('packed tarball analysis', () => {
    it('reads dependency references from the tarball payload', () => {
        const tarball = packFixture({
            dependencies: { '@fixture/lib': '*' },
            files: { 'dist/index.js': "import '@fixture/lib'" },
        })
        const result = analyzePackedTarballWorkspaceDependencyClosure({
            facts: [{ name: '@fixture/lib', state: 'unavailable' }],
            snapshot: createSnapshot([member('@fixture/lib')]),
            tarball,
        })
        expect(result.evidence.closure).toMatchObject({ state: 'blocked' })
        expect(result.evidence.artifact).toBe('unknown')
        expect(result.references['@fixture/lib'].runtime).toEqual([
            'dist/index.js',
        ])
    })

    it('rejects archive symlinks before reading the extracted package', () => {
        const tarball = packLinkedFixture()
        expect(() =>
            analyzePackedTarballWorkspaceDependencyClosure({
                snapshot: createSnapshot([]),
                tarball,
            }),
        ).toThrow('symbolic or hard link')
    })

    it('rejects archive paths that escape the extraction root', () => {
        const tarball = packEscapingFixture()
        expect(() =>
            analyzePackedTarballWorkspaceDependencyClosure({
                snapshot: createSnapshot([]),
                tarball,
            }),
        ).toThrow('unsafe path')
    })
})

describe('isolated package consumer', () => {
    it('installs, imports, typechecks, and runs a bin from a self-contained tarball', () => {
        const tarball = packFixture({
            bin: { fixture: './dist/cli.js' },
            files: {
                'dist/cli.js':
                    '#!/usr/bin/env node\nif (process.argv.includes("--help")) process.exit(0)',
                'dist/index.d.ts': 'export declare const answer: number',
                'dist/index.js': 'export const answer = 42',
            },
            types: './dist/index.d.ts',
        })
        const result = runIsolatedPackageConsumer({
            bins: ['fixture'],
            imports: ['@fixture/self-contained'],
            tarball,
            typecheck: {
                compiler: path.resolve('node_modules/.bin/tsc'),
                source: "import { answer } from '@fixture/self-contained'; answer satisfies number",
            },
        })
        expect(result.state).toBe('passed')
        expect(
            result.checks.map(({ name, state }) => `${name}:${state}`),
        ).toEqual([
            'install:passed',
            'import:@fixture/self-contained:passed',
            'bin:fixture:passed',
            'typecheck:passed',
        ])
    })

    it('only proves optional absence after a successful omitted-optional consumer run', () => {
        const tarball = packFixture({
            files: { 'dist/index.js': 'export const answer = 42' },
            optionalDependencies: {
                '@fixture/not-installed': 'file:./missing',
            },
        })
        const result = runIsolatedPackageConsumer({
            imports: ['@fixture/self-contained'],
            omitOptional: true,
            tarball,
        })
        expect(result).toMatchObject({
            optionalAbsenceProven: true,
            state: 'passed',
        })
    })

    it('does not treat an install-only optional omission as behavioral proof', () => {
        const tarball = packFixture({
            files: { 'dist/index.js': 'export const answer = 42' },
            optionalDependencies: {
                '@fixture/not-installed': 'file:./missing',
            },
        })
        const result = runIsolatedPackageConsumer({
            omitOptional: true,
            tarball,
        })
        expect(result).toMatchObject({
            optionalAbsenceProven: false,
            state: 'passed',
        })
    })
})

function createSnapshot(
    list: ReadonlyArray<WorkspacePackage>,
): WorkspaceSnapshot {
    return {
        list: [...list],
        lookup: new Map(list.map((pkg) => [pkg.name, pkg])),
        repoRoot: '/fixture',
    }
}

function member(name: string): WorkspacePackage {
    return { name, path: 'packages/lib', version: '1.0.0' }
}

function packEscapingFixture(): string {
    const root = mkdtempSync(path.join(tmpdir(), 'doctor-escape-fixture-'))
    temporaryRoots.push(root)
    writeFileSync(path.join(root, 'safe'), 'escape')
    const tarball = path.join(root, 'escape.tgz')
    const packed = spawnSync(
        'tar',
        ['-czf', tarball, '-s', ',^safe$,../escape,', 'safe'],
        { cwd: root, encoding: 'utf8' },
    )
    if (packed.status !== 0) throw new Error(packed.stderr)
    return tarball
}

function packFixture(options: {
    bin?: Record<string, string>
    dependencies?: Record<string, string>
    files: Record<string, string>
    optionalDependencies?: Record<string, string>
    types?: string
}): string {
    const root = mkdtempSync(path.join(tmpdir(), 'doctor-pack-fixture-'))
    temporaryRoots.push(root)
    const packageRoot = path.join(root, 'source')
    mkdirSync(packageRoot, { recursive: true })
    writeFileSync(
        path.join(packageRoot, 'package.json'),
        JSON.stringify({
            bin: options.bin,
            dependencies: options.dependencies,
            exports: './dist/index.js',
            files: ['dist'],
            name: '@fixture/self-contained',
            optionalDependencies: options.optionalDependencies,
            type: 'module',
            types: options.types,
            version: '1.0.0',
        }),
    )
    for (const [file, contents] of Object.entries(options.files)) {
        const target = path.join(packageRoot, file)
        mkdirSync(path.dirname(target), { recursive: true })
        writeFileSync(target, contents)
    }
    const packed = spawnSync(
        'npm',
        ['pack', '--json', '--pack-destination', root],
        {
            cwd: packageRoot,
            encoding: 'utf8',
            env: {
                ...process.env,
                npm_config_cache: path.join(root, '.npm-cache'),
            },
        },
    )
    if (packed.status !== 0) throw new Error(packed.stderr)
    const output = JSON.parse(packed.stdout) as Array<{ filename: string }>
    return path.join(root, output[0]?.filename ?? 'missing.tgz')
}

function packLinkedFixture(): string {
    const root = mkdtempSync(path.join(tmpdir(), 'doctor-linked-fixture-'))
    temporaryRoots.push(root)
    const packageRoot = path.join(root, 'package')
    mkdirSync(packageRoot)
    writeFileSync(
        path.join(packageRoot, 'package.json'),
        JSON.stringify({ name: '@fixture/linked', version: '1.0.0' }),
    )
    symlinkSync('/etc/passwd', path.join(packageRoot, 'escaped.js'))
    const tarball = path.join(root, 'linked.tgz')
    const packed = spawnSync('tar', ['-czf', tarball, 'package'], {
        cwd: root,
        encoding: 'utf8',
    })
    if (packed.status !== 0) throw new Error(packed.stderr)
    return tarball
}
