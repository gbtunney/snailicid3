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
                conditions: ['import', 'types'],
                exportKey: '.',
                target: './dist/index.d.mts',
            },
            {
                conditions: ['import', 'default'],
                exportKey: '.',
                target: './dist/index.mjs',
            },
            {
                conditions: ['require', 'types'],
                exportKey: '.',
                target: './dist/index.d.cts',
            },
            {
                conditions: ['require', 'default'],
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
                conditions: ['import', 'types'],
                exportKey: '.',
                target: './dist/index.d.ts',
            },
            {
                conditions: ['import', 'default'],
                exportKey: '.',
                target: './dist/index.js',
            },
            {
                conditions: ['require', 'types'],
                exportKey: '.',
                target: './dist/index.d.cts',
            },
            {
                conditions: ['require', 'default'],
                exportKey: '.',
                target: './dist/index.cjs',
            },
        ])
    })

    it('B14/B15 routes every dual-format package declaration per resolution mode', () => {
        const dualFormatPackages = {
            'packages/color/package.json': './dist/index.d.ts',
            'packages/node-utils/package.json': './dist/index.d.mts',
            'packages/storybook-config/package.json': './dist/index.d.ts',
            'packages/types/package.json': './dist/index.d.ts',
            'packages/utils/package.json': './dist/index.d.ts',
        } as const

        for (const [relativePath, esmDeclaration] of Object.entries(
            dualFormatPackages,
        )) {
            const targets = collectRootExportTargets(
                readRepositoryManifest(relativePath),
            )

            // A bare top-level `types` would resolve first for both modes and
            // hand ESM consumers the CommonJS declaration.
            expect(
                targets.filter(
                    (target) =>
                        target.conditions.length === 1 &&
                        target.conditions[0] === 'types',
                ),
            ).toEqual([])

            expect(
                targets.find(
                    (target) => target.conditions.join('/') === 'import/types',
                )?.target,
            ).toBe(esmDeclaration)

            expect(
                targets.find(
                    (target) => target.conditions.join('/') === 'require/types',
                )?.target,
            ).toBe('./dist/index.d.cts')
        }
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

    it('B13 keeps the cli-app example out of the public package surface', () => {
        const manifest = readRepositoryManifest('packages/cli-app/package.json')

        expect(manifest.bin).toBeUndefined()
        expect(
            collectDeclaredExportTargets(manifest.exports).some(
                ({ exportKey }) => exportKey === './example',
            ),
        ).toBe(false)
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

    it('accepts logger declaration routing after the fixture is repaired', () => {
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

            expect(analyzePackage(packageRoot).diagnostics).toEqual([])
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

/** Return only the root export targets so package-level routing assertions stay focused. */
function collectRootExportTargets(
    manifest: PackageManifest,
): ReturnType<typeof collectDeclaredExportTargets> {
    return collectDeclaredExportTargets(manifest.exports).filter(
        ({ exportKey }) => exportKey === '.',
    )
}

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
