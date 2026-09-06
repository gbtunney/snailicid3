import { describe, expect, it } from 'vitest'
import {
    chmodSync,
    mkdirSync,
    mkdtempSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
    collectDeclaredExportTargets,
    collectMalformedExportLeaves,
} from './manifest-targets.js'
import { analyzePackage } from './manifest.js'
import type { DiagnosticCode, DoctorDiagnostic } from './types.js'

/** Metadata a publishable package is expected to declare, so these fixtures exercise targets rather than completeness. */
const PUBLISHABLE_METADATA = {
    author: 'Fixture Author',
    description: 'A fixture package used by Doctor tests.',
    license: 'MIT',
    repository: { type: 'git', url: 'https://example.test/repo' },
} as const

describe('exports shape traversal', () => {
    it('walks condition objects, subpath objects and multiple subpaths', () => {
        const targets = collectDeclaredExportTargets({
            '.': { import: './dist/index.js', require: './dist/index.cjs' },
            './alpha': { default: './dist/alpha.js' },
            './beta': './dist/beta.js',
        })

        expect(targets.map(({ fieldPath }) => fieldPath)).toEqual([
            'exports["."].import',
            'exports["."].require',
            'exports["./alpha"].default',
            'exports["./beta"]',
        ])
    })

    it('walks nested condition objects to the string leaf', () => {
        expect(
            collectDeclaredExportTargets({
                '.': { import: { default: './d.js', types: './d.d.ts' } },
            }),
        ).toEqual([
            {
                conditions: ['import', 'default'],
                exportKey: '.',
                fieldPath: 'exports["."].import.default',
                target: './d.js',
            },
            {
                conditions: ['import', 'types'],
                exportKey: '.',
                fieldPath: 'exports["."].import.types',
                target: './d.d.ts',
            },
        ])
    })

    it('addresses array fallbacks by position while keeping conditions semantic', () => {
        // The index is a position rather than a condition, so it belongs in the field path and nowhere else.
        expect(
            collectDeclaredExportTargets({
                '.': { import: ['./dist/first.js', './dist/second.js'] },
            }),
        ).toEqual([
            {
                conditions: ['import'],
                exportKey: '.',
                fieldPath: 'exports["."].import[0]',
                target: './dist/first.js',
            },
            {
                conditions: ['import'],
                exportKey: '.',
                fieldPath: 'exports["."].import[1]',
                target: './dist/second.js',
            },
        ])
    })

    it('treats a null subpath as an exclusion rather than a target', () => {
        expect(
            collectDeclaredExportTargets({
                '.': './dist/index.js',
                './internal': null,
            }).map(({ fieldPath }) => fieldPath),
        ).toEqual(['exports["."]'])
        expect(
            collectMalformedExportLeaves({
                '.': './dist/index.js',
                './internal': null,
            }),
        ).toEqual([])
    })

    it('addresses a shorthand exports value by the field it actually occupies', () => {
        // There is no `exports["."]` in the manifest to point at when the map is a bare string or a bare condition set.
        expect(collectDeclaredExportTargets('./dist/index.js')).toEqual([
            {
                conditions: [],
                exportKey: '.',
                fieldPath: 'exports',
                target: './dist/index.js',
            },
        ])
        expect(
            collectDeclaredExportTargets({
                import: './dist/index.js',
            }).map(({ fieldPath }) => fieldPath),
        ).toEqual(['exports.import'])
    })

    it('reports a leaf that is neither a string nor a null exclusion', () => {
        expect(collectMalformedExportLeaves({ '.': { import: 42 } })).toEqual([
            { fieldPath: 'exports["."].import', typeName: 'number' },
        ])
    })
})

describe('export target validation', () => {
    it('accepts a package whose every declared shape resolves', () => {
        withTempPackage(
            {
                exports: {
                    '.': {
                        import: { default: './dist/index.js' },
                        require: ['./dist/index.cjs', './dist/legacy.cjs'],
                    },
                    './excluded': null,
                    './linked': './dist/link.js',
                    './wildcard/*': './dist/features/*.js',
                },
                name: '@fixture/every-shape',
                version: '1.0.0',
            },
            {
                './dist/features/one.js': 'export {}\n',
                './dist/index.cjs': 'module.exports = {}\n',
                './dist/index.js': 'export {}\n',
                './dist/legacy.cjs': 'module.exports = {}\n',
            },
            (packageRoot) => {
                symlinkSync(
                    path.join(packageRoot, 'dist/index.js'),
                    path.join(packageRoot, 'dist/link.js'),
                )

                expect(analyzePackage(packageRoot).diagnostics).toEqual([])
            },
        )
    })

    /**
     * Every entry of a fallback array is validated, not merely the first that resolves.
     *
     * Node's array handling falls back on a target it cannot resolve as a specifier, not on one whose file is absent:
     * an entry pointing at nothing is still selected and then fails at load. So an absent entry is a real hazard
     * wherever it sits in the list, and #225 asks for every string leaf to be validated.
     */
    it('reports each fallback entry that is absent, by position', () => {
        withTempPackage(
            {
                exports: { '.': { import: ['./dist/a.js', './dist/b.js'] } },
                name: '@fixture/fallbacks',
                version: '1.0.0',
            },
            { './dist/a.js': 'export {}\n' },
            (packageRoot) => {
                expect(
                    evidenceFor(packageRoot, 'EXPORT_TARGET_MISSING'),
                ).toEqual([
                    'package.json#exports["."].import[1] -> ./dist/b.js',
                ])
            },
        )
    })

    it('reports a concrete target that does not exist', () => {
        withTempPackage(
            {
                exports: { './node': { import: './dist/node.mjs' } },
                name: '@fixture/missing',
                version: '1.0.0',
            },
            {},
            (packageRoot) => {
                expect(
                    evidenceFor(packageRoot, 'EXPORT_TARGET_MISSING'),
                ).toEqual([
                    'package.json#exports["./node"].import -> ./dist/node.mjs',
                ])
            },
        )
    })

    it('accepts a wildcard target that matches, including below its own directory', () => {
        withTempPackage(
            {
                exports: {
                    './flat/*': './dist/flat/*.js',
                    './nested/*': './dist/nested/*.js',
                },
                name: '@fixture/wildcards',
                version: '1.0.0',
            },
            {
                // Npm's `*` spans separators, so a match one level down still satisfies the declaration.
                './dist/flat/one.js': 'export {}\n',
                './dist/nested/deeper/two.js': 'export {}\n',
            },
            (packageRoot) => {
                expect(analyzePackage(packageRoot).diagnostics).toEqual([])
            },
        )
    })

    it('reports a wildcard target that matches nothing instead of skipping it', () => {
        withTempPackage(
            {
                exports: { './feature/*': './dist/features/*.js' },
                name: '@fixture/unmatched-wildcard',
                version: '1.0.0',
            },
            { './dist/other.js': 'export {}\n' },
            (packageRoot) => {
                expect(
                    evidenceFor(packageRoot, 'EXPORT_TARGET_MISSING'),
                ).toEqual([
                    'package.json#exports["./feature/*"] -> ./dist/features/*.js (wildcard matched no files)',
                ])
            },
        )
    })

    it('reports a target that escapes the package root even when that file exists', () => {
        withTempPackage(
            {
                exports: {
                    '.': './../outside.js',
                    './up': '../outside.js',
                },
                name: '@fixture/escape',
                version: '1.0.0',
            },
            { '../outside.js': 'export {}\n' },
            (packageRoot) => {
                // Root escape and a bad specifier are both wrong as declared, so both are errors rather than
                // "not built yet" — and neither is reported as a missing target.
                expect(
                    evidenceFor(packageRoot, 'EXPORT_TARGET_INVALID'),
                ).toEqual([
                    'package.json#exports["."] -> ./../outside.js (target leaves the package root)',
                    'package.json#exports["./up"] -> ../outside.js (target must start with ./)',
                ])
                expect(
                    evidenceFor(packageRoot, 'EXPORT_TARGET_MISSING'),
                ).toEqual([])
                expect(
                    diagnosticFor(packageRoot, 'EXPORT_TARGET_INVALID')
                        ?.severity,
                ).toBe('error')
            },
        )
    })

    it('reports a directory as unusable rather than as a resolved target', () => {
        withTempPackage(
            {
                exports: { '.': './dist' },
                name: '@fixture/directory-target',
                version: '1.0.0',
            },
            { './dist/index.js': 'export {}\n' },
            (packageRoot) => {
                expect(
                    evidenceFor(packageRoot, 'EXPORT_TARGET_MISSING'),
                ).toEqual(['package.json#exports["."] -> ./dist'])
            },
        )
    })
})

describe('legacy entry target validation', () => {
    it('reports main, module and types independently, by field path', () => {
        withTempPackage(
            {
                main: './dist/index.cjs',
                module: './dist/index.mjs',
                name: '@fixture/legacy',
                types: './dist/index.d.cts',
                version: '1.0.0',
            },
            { './dist/index.mjs': 'export {}\n' },
            (packageRoot) => {
                expect(
                    evidenceFor(packageRoot, 'LEGACY_TARGET_MISSING'),
                ).toEqual([
                    'package.json#main -> ./dist/index.cjs',
                    'package.json#types -> ./dist/index.d.cts',
                ])
            },
        )
    })

    it('accepts a bare specifier, which npm has always allowed in these fields', () => {
        withTempPackage(
            {
                main: 'dist/index.js',
                name: '@fixture/bare-legacy',
                version: '1.0.0',
            },
            { './dist/index.js': 'export {}\n' },
            (packageRoot) => {
                expect(
                    evidenceFor(packageRoot, 'LEGACY_TARGET_MISSING'),
                ).toEqual([])
            },
        )
    })

    it('reports a legacy target that escapes the package root', () => {
        withTempPackage(
            {
                main: '../outside.js',
                name: '@fixture/legacy-escape',
                version: '1.0.0',
            },
            { '../outside.js': 'module.exports = {}\n' },
            (packageRoot) => {
                // It resolves on this machine and would not exist in the published package.
                expect(
                    evidenceFor(packageRoot, 'LEGACY_TARGET_MISSING'),
                ).toEqual([
                    'package.json#main -> ../outside.js (target leaves the package root)',
                ])
            },
        )
    })
})

describe('bin target validation', () => {
    it('validates a string bin under the field that declares it', () => {
        withTempPackage(
            {
                bin: './dist/cli.js',
                name: '@fixture/string-bin',
                version: '1.0.0',
            },
            {},
            (packageRoot) => {
                expect(evidenceFor(packageRoot, 'BIN_TARGET_MISSING')).toEqual([
                    'package.json#bin -> ./dist/cli.js',
                ])
            },
        )
    })

    it('validates every entry of a bin map by name', () => {
        withTempPackage(
            {
                bin: { one: './dist/one.js', two: './dist/two.js' },
                name: '@fixture/map-bin',
                version: '1.0.0',
            },
            { './dist/one.js': '#!/usr/bin/env node\n' },
            (packageRoot) => {
                chmodSync(path.join(packageRoot, 'dist/one.js'), 0o755)

                expect(evidenceFor(packageRoot, 'BIN_TARGET_MISSING')).toEqual([
                    'package.json#bin["two"] -> ./dist/two.js',
                ])
            },
        )
    })

    it('refines a resolved bin with the executable bit', () => {
        withTempPackage(
            {
                bin: { demo: './dist/cli.js' },
                name: '@fixture/bin-mode',
                version: '1.0.0',
            },
            { './dist/cli.js': '#!/usr/bin/env node\n' },
            (packageRoot) => {
                chmodSync(path.join(packageRoot, 'dist/cli.js'), 0o644)

                expect(
                    evidenceFor(packageRoot, 'BIN_TARGET_NOT_EXECUTABLE'),
                ).toEqual(['package.json#bin["demo"] -> ./dist/cli.js'])
                // Existence came first: an absent target is never also reported as not executable.
                expect(evidenceFor(packageRoot, 'BIN_TARGET_MISSING')).toEqual(
                    [],
                )
            },
        )
    })

    it('does not ask whether an absent bin is executable', () => {
        withTempPackage(
            {
                bin: { gone: './dist/gone.js' },
                name: '@fixture/bin-absent',
                version: '1.0.0',
            },
            {},
            (packageRoot) => {
                expect(
                    evidenceFor(packageRoot, 'BIN_TARGET_NOT_EXECUTABLE'),
                ).toEqual([])
                expect(evidenceFor(packageRoot, 'BIN_TARGET_MISSING')).toEqual([
                    'package.json#bin["gone"] -> ./dist/gone.js',
                ])
            },
        )
    })
})

function diagnosticFor(
    packageRoot: string,
    code: DiagnosticCode,
): DoctorDiagnostic | undefined {
    return analyzePackage(packageRoot).diagnostics.find(
        (diagnostic) => diagnostic.code === code,
    )
}

/** The evidence one collector produced, or an empty list when it produced no finding at all. */
function evidenceFor(
    packageRoot: string,
    code: DiagnosticCode,
): ReadonlyArray<string> {
    return diagnosticFor(packageRoot, code)?.evidence ?? []
}

/**
 * Build a throwaway package, one directory below a temporary root.
 *
 * The extra level exists so a fixture can write a file at `../outside.js` and prove that a target reaching it is
 * rejected for leaving the package rather than merely for being absent.
 */
function withTempPackage(
    manifest: Readonly<Record<string, unknown>>,
    files: Readonly<Record<string, string>>,
    assertion: (packageRoot: string) => void,
): void {
    const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'snail-doctor-'))
    const packageRoot = path.join(temporaryRoot, 'package')

    try {
        mkdirSync(packageRoot, { recursive: true })
        writeFileSync(
            path.join(packageRoot, 'package.json'),
            JSON.stringify({ ...PUBLISHABLE_METADATA, ...manifest }),
        )

        for (const [relativePath, contents] of Object.entries(files)) {
            const filePath = path.resolve(packageRoot, relativePath)
            mkdirSync(path.dirname(filePath), { recursive: true })
            writeFileSync(filePath, contents)
        }

        assertion(packageRoot)
    } finally {
        rmSync(temporaryRoot, { force: true, recursive: true })
    }
}
