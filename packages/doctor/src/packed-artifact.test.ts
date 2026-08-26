import type {
    ReleasePublishDoctorEvidence,
    WorkspacePackage,
    WorkspaceSnapshot,
} from '@snailicid3/workspace'
import {
    createReleasePlan,
    createReleasePublishPlan,
} from '@snailicid3/workspace'
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
import { gzipSync } from 'node:zlib'
import { analyzeWorkspaceDependencyClosure } from './dependency-closure.js'
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

    it('blocks an unavailable optional workspace dependency without consumer proof', () => {
        const tarball = packFixture({
            files: { 'dist/index.js': 'export const answer = 42' },
            optionalDependencies: {
                '@fixture/not-installed': 'file:./missing',
            },
        })
        const result = analyzePackedTarballWorkspaceDependencyClosure({
            facts: [{ name: '@fixture/not-installed', state: 'unavailable' }],
            snapshot: createSnapshot([member('@fixture/not-installed')]),
            tarball,
        })
        expect(result.evidence.closure).toMatchObject({ state: 'blocked' })
    })

    it('allows an unavailable optional dependency after a relevant omitted-optional consumer run', () => {
        const tarball = packFixture({
            dependencies: {
                '@fixture/not-installed': 'file:./missing',
            },
            files: { 'dist/index.js': 'export const answer = 42' },
            optionalDependencies: {
                '@fixture/not-installed': 'file:./missing',
            },
        })
        const result = analyzePackedTarballWorkspaceDependencyClosure({
            consumer: { imports: ['@fixture/self-contained'] },
            facts: [{ name: '@fixture/not-installed', state: 'unavailable' }],
            snapshot: createSnapshot([member('@fixture/not-installed')]),
            tarball,
        })
        expect(result.evidence.closure).toEqual({ edges: [], state: 'valid' })
    })

    it('proves an inlined workspace dependency left the consumer-facing contract', () => {
        const tarball = packFixture({
            files: {
                'dist/index.js': 'export const answer = 42',
                'dist/index.js.map': sourceMap('packages/private'),
            },
            optionalDependencies: { '@fixture/private': 'file:./missing' },
        })
        const result = analyzePackedTarballWorkspaceDependencyClosure({
            consumer: { imports: ['@fixture/self-contained'] },
            snapshot: createSnapshot([privateMember('@fixture/private')]),
            tarball,
        })

        expect(result.evidence.closure).toEqual({
            edges: [
                {
                    name: '@fixture/private',
                    resolution: 'embedded_not_exposed',
                },
            ],
            state: 'valid',
        })
        expect(result.diagnostics.map(({ code }) => code)).toEqual([
            'PRIVATE_WORKSPACE_CODE_EMBEDDED',
        ])
        // An embedded edge is a closure fact Workspace can act on: it adds no cohort requirement, while the disclosure
        // finding above stays a separate review item rather than a publication permission.
        expect(publishWith(result.evidence.closure).packages[0]).toMatchObject({
            decision: 'planned',
            requires: [],
        })
    })

    it('does not call an inlined dependency self-contained while a declaration still references it', () => {
        const tarball = packFixture({
            files: {
                'dist/index.d.ts':
                    "export type { Secret } from '@fixture/private'",
                'dist/index.js': 'export const answer = 42',
                'dist/index.js.map': sourceMap('packages/private'),
            },
            optionalDependencies: { '@fixture/private': 'file:./missing' },
            types: './dist/index.d.ts',
        })
        const result = analyzePackedTarballWorkspaceDependencyClosure({
            consumer: { imports: ['@fixture/self-contained'] },
            facts: [{ name: '@fixture/private', state: 'unavailable' }],
            snapshot: createSnapshot([privateMember('@fixture/private')]),
            tarball,
        })

        expect(result.references['@fixture/private'].declaration).toEqual([
            'dist/index.d.ts',
        ])
        expect(result.evidence.closure).toMatchObject({ state: 'blocked' })
    })

    it('keeps a bundled npm module exposed instead of calling it embedded', () => {
        const tarball = packFixture({
            dependencies: { '@fixture/private': '*' },
            files: {
                'dist/index.js': 'export const answer = 42',
                'node_modules/@fixture/private/dist/index.js':
                    'export const secret = 1',
                'node_modules/@fixture/private/package.json': JSON.stringify({
                    main: './dist/index.js',
                    name: '@fixture/private',
                    type: 'module',
                    version: '1.0.0',
                }),
            },
            manifest: { bundleDependencies: ['@fixture/private'] },
        })
        const result = analyzePackedTarballWorkspaceDependencyClosure({
            consumer: { imports: ['@fixture/self-contained'] },
            facts: [{ name: '@fixture/private', state: 'unavailable' }],
            snapshot: createSnapshot([privateMember('@fixture/private')]),
            tarball,
        })

        // Shipping the package keeps its specifier resolvable, so this is distribution of the code, not removal of the
        // dependency; the disclosure finding still fires because the private source now travels in a public artifact.
        expect(result.provenance.map(({ kind }) => kind)).toEqual([
            'bundled_module',
        ])
        expect(result.evidence.closure).toMatchObject({ state: 'blocked' })
        expect(result.diagnostics.map(({ code }) => code)).toContain(
            'PRIVATE_WORKSPACE_CODE_EMBEDDED',
        )
    })

    it('does not allow an unavailable optional dependency after an install-only run', () => {
        const tarball = packFixture({
            files: { 'dist/index.js': 'export const answer = 42' },
            optionalDependencies: {
                '@fixture/not-installed': 'file:./missing',
            },
        })
        const result = analyzePackedTarballWorkspaceDependencyClosure({
            consumer: {},
            facts: [{ name: '@fixture/not-installed', state: 'unavailable' }],
            snapshot: createSnapshot([member('@fixture/not-installed')]),
            tarball,
        })
        expect(result.evidence.closure).toMatchObject({ state: 'blocked' })
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

    it('proves optional absence per package after a successful omitted-optional consumer run', () => {
        const tarball = packFixture({
            files: { 'dist/index.js': 'export const answer = 42' },
            optionalDependencies: {
                '@fixture/not-installed': 'file:./missing',
            },
        })
        const result = runIsolatedPackageConsumer({
            absentPackages: ['@fixture/not-installed'],
            imports: ['@fixture/self-contained'],
            omitOptional: true,
            tarball,
        })
        expect(result).toMatchObject({
            absenceProven: ['@fixture/not-installed'],
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
            absentPackages: ['@fixture/not-installed'],
            omitOptional: true,
            tarball,
        })
        expect(result).toMatchObject({
            absenceProven: [],
            state: 'passed',
        })
    })

    it('does not waive an ordinary runtime dependency with optional consumer evidence', () => {
        const tarball = packFixture({
            files: { 'dist/index.js': 'export const answer = 42' },
            optionalDependencies: {
                '@fixture/not-installed': 'file:./missing',
            },
        })
        const consumerEvidence = runIsolatedPackageConsumer({
            absentPackages: ['@fixture/not-installed'],
            imports: ['@fixture/self-contained'],
            omitOptional: true,
            tarball,
        })
        const artifactRoot = createArtifact({
            dependencies: { '@fixture/lib': '^1.0.0' },
        })
        const result = analyzeWorkspaceDependencyClosure({
            artifactRoot,
            consumerEvidence,
            facts: [{ name: '@fixture/lib', state: 'unavailable' }],
            snapshot: createSnapshot([member('@fixture/lib')]),
        })
        expect(result.evidence.closure).toMatchObject({ state: 'blocked' })
    })
})

function createArtifact(manifest: Record<string, unknown>): string {
    const root = mkdtempSync(path.join(tmpdir(), 'doctor-artifact-fixture-'))
    temporaryRoots.push(root)
    writeFileSync(
        path.join(root, 'package.json'),
        JSON.stringify({ name: '@fixture/app', version: '1.0.0', ...manifest }),
    )
    return root
}

function createSnapshot(
    list: ReadonlyArray<WorkspacePackage>,
): WorkspaceSnapshot {
    return {
        list: [...list],
        lookup: new Map(list.map((pkg) => [pkg.name, pkg])),
        repoRoot: '/fixture',
    }
}

function createTar(name: string, contents: string): Buffer {
    const body = Buffer.from(contents)
    const header = Buffer.alloc(512)
    header.write(name, 0, 100, 'utf8')
    writeTarOctal(header, 100, 8, 0o644)
    writeTarOctal(header, 108, 8, 0)
    writeTarOctal(header, 116, 8, 0)
    writeTarOctal(header, 124, 12, body.length)
    writeTarOctal(header, 136, 12, 0)
    header.fill(' ', 148, 156)
    header.write('0', 156, 1, 'ascii')
    header.write('ustar\0', 257, 6, 'ascii')
    header.write('00', 263, 2, 'ascii')

    const checksum = header.reduce((sum, byte) => sum + byte, 0)
    header.write(checksum.toString(8).padStart(6, '0'), 148, 6, 'ascii')
    header[154] = 0
    header[155] = 0x20

    const padding = Buffer.alloc((512 - (body.length % 512)) % 512)
    return Buffer.concat([header, body, padding, Buffer.alloc(1024)])
}

function member(name: string): WorkspacePackage {
    return { name, path: 'packages/lib', version: '1.0.0' }
}

function packEscapingFixture(): string {
    const root = mkdtempSync(path.join(tmpdir(), 'doctor-escape-fixture-'))
    temporaryRoots.push(root)
    const tarball = path.join(root, 'escape.tgz')
    writeFileSync(tarball, gzipSync(createTar('../escape', 'escape')))
    return tarball
}

function packFixture(options: {
    bin?: Record<string, string>
    dependencies?: Record<string, string>
    files: Record<string, string>
    manifest?: Record<string, unknown>
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
            ...options.manifest,
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

function privateMember(name: string): WorkspacePackage {
    return {
        name,
        path: `packages/${name.split('/').at(-1) ?? 'package'}`,
        private: true,
        version: '1.0.0',
    }
}

function publishWith(closure: ReleasePublishDoctorEvidence['closure']) {
    const artifact = {
        integrity: `sha512-${'a'.repeat(86)}==`,
        name: '@fixture/self-contained',
        tarball: 'releases/fixture-self-contained-1.0.0.tgz',
        version: '1.0.0',
    }
    return createReleasePublishPlan({
        candidates: [
            {
                artifact,
                // Packed-artifact validity belongs to the later artifact collectors, so it is supplied here rather
                // than claimed by #226; the closure below is Doctor's own output.
                doctor: { artifact: 'valid', closure },
                name: artifact.name,
            },
        ],
        channel: 'latest',
        plan: createReleasePlan({
            packages: [
                {
                    doctor: { artifact: 'valid', dependencyClosure: 'valid' },
                    gitTag: { selected: false },
                    intent: { source: 'none' },
                    name: artifact.name,
                    policy: {
                        channel: 'latest',
                        decision: 'selected',
                        reason: 'Explicit release operation',
                    },
                    private: false,
                    registry: {
                        distTags: {},
                        registryUrl: 'https://registry.npmjs.org/',
                        state: 'missing',
                    },
                    version: '1.0.0',
                    versionState: { state: 'current' },
                },
            ],
        }),
        selection: [artifact.name],
    })
}

function sourceMap(workspacePath: string): string {
    return JSON.stringify({
        mappings: '',
        names: [],
        sources: [`../../${workspacePath}/src/index.ts`],
        version: 3,
    })
}

function writeTarOctal(
    header: Buffer,
    offset: number,
    length: number,
    value: number,
): void {
    header.write(
        value.toString(8).padStart(length - 1, '0'),
        offset,
        length - 1,
        'ascii',
    )
    header[offset + length - 1] = 0
}
