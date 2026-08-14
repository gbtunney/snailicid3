import { describe, expect, it } from 'vitest'
import {
    chmodSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    analyzePackage,
    collectDeclaredExportTargets,
    type PackageManifest,
} from './manifest.js'

const repositoryRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../..',
)

describe('collectDeclaredExportTargets', () => {
    it('preserves subpath and conditional routing evidence', () => {
        expect(
            collectDeclaredExportTargets({
                '.': {
                    import: './dist/index.js',
                    require: './dist/index.cjs',
                },
                './package.json': './package.json',
            }),
        ).toEqual([
            {
                conditions: ['import'],
                exportKey: '.',
                target: './dist/index.js',
            },
            {
                conditions: ['require'],
                exportKey: '.',
                target: './dist/index.cjs',
            },
            {
                conditions: [],
                exportKey: './package.json',
                target: './package.json',
            },
        ])
    })
})

describe('repository package export maps', () => {
    it('B1 exposes node-utils declarations, ESM, and CJS in condition order', () => {
        const manifest = readRepositoryManifest(
            'packages/node-utils/package.json',
        )

        expect(collectRootExportTargets(manifest)).toEqual([
            {
                conditions: ['types'],
                exportKey: '.',
                target: './dist/index.d.cts',
            },
            {
                conditions: ['import'],
                exportKey: '.',
                target: './dist/index.mjs',
            },
            {
                conditions: ['require'],
                exportKey: '.',
                target: './dist/index.cjs',
            },
        ])
    })

    it('B2 keeps utils module exports and publishes its IIFE for CDNs', () => {
        const manifest = readRepositoryManifest('packages/utils/package.json')

        expect(manifest).toMatchObject({
            jsdelivr: './dist/index.iife.js',
            unpkg: './dist/index.iife.js',
        })
        expect(collectRootExportTargets(manifest)).toEqual([
            {
                conditions: ['types'],
                exportKey: '.',
                target: './dist/index.d.cts',
            },
            {
                conditions: ['import'],
                exportKey: '.',
                target: './dist/index.js',
            },
            {
                conditions: ['require'],
                exportKey: '.',
                target: './dist/index.cjs',
            },
        ])
    })

    it('B3 puts config and workspace declarations before imports', () => {
        for (const relativePath of [
            'packages/config/package.json',
            'packages/workspace/package.json',
        ]) {
            const manifest = readRepositoryManifest(relativePath)

            expect(collectRootExportTargets(manifest)).toEqual([
                {
                    conditions: ['types'],
                    exportKey: '.',
                    target: './types/index.d.ts',
                },
                {
                    conditions: ['import'],
                    exportKey: '.',
                    target: './dist/index.js',
                },
            ])
        }
    })

    it('B4 exposes cli-app declarations before its ESM entry', () => {
        const manifest = readRepositoryManifest('packages/cli-app/package.json')

        expect(collectRootExportTargets(manifest)).toEqual([
            {
                conditions: ['types'],
                exportKey: '.',
                target: './dist/index.d.mts',
            },
            {
                conditions: ['import'],
                exportKey: '.',
                target: './dist/index.mjs',
            },
        ])
    })

    it('B13 keeps the cli-app example importable without a public bin', () => {
        const manifest = readRepositoryManifest('packages/cli-app/package.json')

        expect(manifest.bin).toBeUndefined()
        expect(collectDeclaredExportTargets(manifest.exports)).toContainEqual({
            conditions: [],
            exportKey: './example',
            target: './dist/example.mjs',
        })
    })
})

describe('analyzePackage', () => {
    it('reports no findings for aligned exports, declarations, and bins', () => {
        withTempPackage(
            {
                bin: { demo: './dist/cli.js' },
                exports: {
                    '.': {
                        import: './dist/index.js',
                        types: './dist/index.d.ts',
                    },
                    './package.json': './package.json',
                },
                main: './dist/index.js',
                name: '@fixture/aligned',
                types: './dist/index.d.ts',
                version: '1.0.0',
            },
            {
                './dist/cli.js': '#!/usr/bin/env node\n',
                './dist/index.d.ts': 'export {}\n',
                './dist/index.js': 'export {}\n',
            },
            (packageRoot) => {
                chmodSync(path.join(packageRoot, 'dist/cli.js'), 0o755)
                expect(analyzePackage(packageRoot).diagnostics).toEqual([])
            },
        )
    })

    it('labels the retained example-package export finding', () => {
        const manifest = readRepositoryManifest(
            'packages/example-package/package.json',
        )

        withTempPackage(manifest, {}, (packageRoot) => {
            const report = analyzePackage(packageRoot)
            const diagnostic = report.diagnostics.find(
                ({ code }) => code === 'EXPORT_TARGET_MISSING',
            )

            expect(diagnostic?.fixtureId).toBe('EXP-EXAMPLE-001')
            expect(diagnostic?.evidence).toContain(
                '. (import) -> ./dist/index.js',
            )
        })
    })

    it('labels logger declaration routing without claiming runtime import failure', () => {
        const manifest = readRepositoryManifest('packages/logger/package.json')
        const binTarget = getOnlyBinTarget(manifest)
        const emittedFiles: Record<string, string> = {
            [binTarget]: '#!/usr/bin/env node\n',
        }

        for (const { target } of collectDeclaredExportTargets(
            manifest.exports,
        )) {
            if (target !== './package.json')
                emittedFiles[target] = 'export {}\n'
        }

        if (typeof manifest.main === 'string') {
            emittedFiles[manifest.main] = 'module.exports = {}\n'
        }
        if (typeof manifest.module === 'string') {
            emittedFiles[manifest.module] = 'export {}\n'
        }
        if (typeof manifest.types === 'string') {
            emittedFiles[manifest.types] = 'export {}\n'
        }

        withTempPackage(manifest, emittedFiles, (packageRoot) => {
            chmodSync(path.resolve(packageRoot, binTarget), 0o755)

            const diagnostics = analyzePackage(packageRoot).diagnostics

            expect(diagnostics).toEqual([
                expect.objectContaining({
                    code: 'EXPORT_TYPES_CONDITION_MISSING',
                    fixtureId: 'EXP-LOGGER-001',
                }),
            ])
        })
    })

    it('keeps an equivalent finding unregistered for other packages', () => {
        withTempPackage(
            {
                exports: { '.': { import: './dist/index.js' } },
                name: '@fixture/unregistered',
                types: './dist/index.d.ts',
                version: '1.0.0',
            },
            {
                './dist/index.d.ts': 'export {}\n',
                './dist/index.js': 'export {}\n',
            },
            (packageRoot) => {
                const diagnostic = analyzePackage(packageRoot).diagnostics[0]

                expect(diagnostic.code).toBe('EXPORT_TYPES_CONDITION_MISSING')
                expect(diagnostic.fixtureId).toBeUndefined()
            },
        )
    })
})

function getOnlyBinTarget(manifest: PackageManifest): string {
    const bin: unknown = manifest.bin

    if (typeof bin !== 'object' || bin === null || Array.isArray(bin)) {
        throw new TypeError('Expected one bin map')
    }

    const target: unknown = Object.values(bin)[0]
    if (typeof target !== 'string')
        throw new TypeError('Expected one bin target')
    return target
}

/** Return only the root export targets so package-level routing assertions stay focused. */
function collectRootExportTargets(
    manifest: PackageManifest,
): ReturnType<typeof collectDeclaredExportTargets> {
    return collectDeclaredExportTargets(manifest.exports).filter(
        ({ exportKey }) => exportKey === '.',
    )
}

function readRepositoryManifest(relativePath: string): PackageManifest {
    return JSON.parse(
        readFileSync(path.join(repositoryRoot, relativePath), 'utf8'),
    ) as PackageManifest
}

function withTempPackage(
    manifest: PackageManifest,
    files: Readonly<Record<string, string>>,
    assertion: (packageRoot: string) => void,
): void {
    const packageRoot = mkdtempSync(path.join(tmpdir(), 'snail-doctor-'))

    try {
        writeFileSync(
            path.join(packageRoot, 'package.json'),
            JSON.stringify(manifest),
        )

        for (const [relativePath, contents] of Object.entries(files)) {
            const filePath = path.resolve(packageRoot, relativePath)
            mkdirSync(path.dirname(filePath), { recursive: true })
            writeFileSync(filePath, contents)
        }

        assertion(packageRoot)
    } finally {
        rmSync(packageRoot, { force: true, recursive: true })
    }
}
