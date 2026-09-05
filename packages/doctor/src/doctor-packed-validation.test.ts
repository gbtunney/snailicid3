import { afterEach, describe, expect, it, vi } from 'vitest'
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
import main from './cli.js'
import { runDoctorWithPackedValidation } from './doctor.js'
import type { DoctorReport } from './types.js'

const temporaryRoots: Array<string> = []

afterEach(() => {
    vi.restoreAllMocks()
    for (const root of temporaryRoots.splice(0)) {
        rmSync(root, { force: true, recursive: true })
    }
})

/** Filesystem discovery, so a fixture workspace needs no package-manager state of its own. */
const DISCOVERY = { usePackageManager: false } as const

describe('package selection drives packed validation', () => {
    it('packs only the selected package, not the workspace', async () => {
        // `unpackable` fails to pack. If selection did not scope packing, its failure would appear here.
        const root = createWorkspace(['valid', 'unpackable'])

        const report = await runDoctorWithPackedValidation({
            discovery: DISCOVERY,
            packageNames: ['@fixture/valid'],
            root,
        })

        expect(names(report)).toEqual(['@fixture/valid'])
        expect(codes(report)).not.toContain('PACK_CANDIDATE_FAILED')
        expect(report.packages[0]?.packedValidation).toBeDefined()
    }, 120_000)

    it('proves the unselected package would otherwise have been packed', async () => {
        const root = createWorkspace(['valid', 'unpackable'])

        const report = await runDoctorWithPackedValidation({
            discovery: DISCOVERY,
            root,
        })

        // The same workspace with no filter does reach it, which is what makes the scoping test above meaningful.
        expect(codes(report)).toContain('PACK_CANDIDATE_FAILED')
    }, 120_000)

    it('selects exactly the packages named by repeated --package', async () => {
        const root = createWorkspace(['valid', 'untyped', 'broken'])

        const report = await runDoctorWithPackedValidation({
            discovery: DISCOVERY,
            packageNames: ['@fixture/untyped', '@fixture/valid'],
            root,
        })

        // Requested in one order, reported in the deterministic one.
        expect(names(report)).toEqual(['@fixture/untyped', '@fixture/valid'])
    }, 120_000)

    it('validates the whole workspace in deterministic order with no filter', async () => {
        const root = createWorkspace(['untyped', 'broken', 'valid'])

        const report = await runDoctorWithPackedValidation({
            discovery: DISCOVERY,
            root,
        })

        // The workspace root carries a manifest too, so filesystem discovery reports four packages, sorted.
        expect(names(report)).toEqual([
            '@fixture/broken',
            '@fixture/root',
            '@fixture/untyped',
            '@fixture/valid',
        ])
        for (const packageReport of report.packages) {
            expect(packageReport.packedValidation).toBeDefined()
        }
    }, 120_000)

    it('rejects an unknown package name before packing anything', async () => {
        const root = createWorkspace(['valid'])

        await expect(
            runDoctorWithPackedValidation({
                discovery: DISCOVERY,
                packageNames: ['@fixture/absent'],
                root,
            }),
        ).rejects.toThrow(/Requested packages not found: @fixture\/absent/u)
    }, 120_000)
})

describe('packed validation reaches the Doctor report', () => {
    it('reports completed collector outcomes for a well-formed package', async () => {
        const root = createWorkspace(['valid'])

        const report = await runDoctorWithPackedValidation({
            discovery: DISCOVERY,
            packageNames: ['@fixture/valid'],
            root,
        })

        const evidence = report.packages[0]?.packedValidation
        expect(evidence?.publint).toEqual({ state: 'completed' })
        expect(evidence?.attw).toEqual({ state: 'completed' })
        expect(codes(report)).not.toContain('ATTW_RESOLUTION_PROBLEM')
    }, 120_000)

    it('surfaces packed-validator findings for a deliberately broken package', async () => {
        const root = createWorkspace(['broken'])

        const report = await runDoctorWithPackedValidation({
            discovery: DISCOVERY,
            packageNames: ['@fixture/broken'],
            root,
        })

        const publintFindings = report.diagnostics.filter((diagnostic) =>
            diagnostic.code.startsWith('PUBLINT_'),
        )
        expect(publintFindings.length).toBeGreaterThan(0)
        // The evidence still names the offending manifest route once it has travelled through the report.
        expect(
            publintFindings.flatMap((diagnostic) => diagnostic.evidence),
        ).toContainEqual(expect.stringContaining('exports["./missing"]'))
    }, 120_000)

    it('keeps ATTW not_applicable distinguishable from a clean pass', async () => {
        const root = createWorkspace(['untyped', 'valid'])

        const report = await runDoctorWithPackedValidation({
            discovery: DISCOVERY,
            root,
        })

        const untyped = find(report, '@fixture/untyped')
        const valid = find(report, '@fixture/valid')
        // Both carry zero ATTW findings; only the outcome separates "no types to judge" from "types judged clean".
        expect(untyped?.attw).toEqual({
            reason: 'the package publishes no type declarations',
            state: 'not_applicable',
        })
        expect(valid?.attw).toEqual({ state: 'completed' })
    }, 120_000)

    it('counts packed-validator findings exactly once', async () => {
        const root = createWorkspace(['broken'])

        const report = await runDoctorWithPackedValidation({
            discovery: DISCOVERY,
            packageNames: ['@fixture/broken'],
            root,
        })

        const perPackage = report.packages.flatMap(
            (packageReport) => packageReport.diagnostics,
        )
        expect(report.diagnostics).toHaveLength(perPackage.length)
        expect(report.summary.findings).toBe(perPackage.length)
        expect(
            report.summary.knownFixtureFindings +
                report.summary.unregisteredFindings,
        ).toBe(report.summary.findings)
    }, 120_000)

    it('leaves every packed source tree byte-identical', async () => {
        const root = createWorkspace(['valid', 'untyped'])
        const before = snapshotTree(root)

        await runDoctorWithPackedValidation({ discovery: DISCOVERY, root })

        expect(snapshotTree(root)).toEqual(before)
    }, 120_000)
})

describe('the CLI carries the evidence through --json', () => {
    it('emits packed file inventory and collector outcomes', async () => {
        const root = createWorkspace(['valid'])
        const logged = captureStdout()

        await main([root, '--package', '@fixture/valid', '--json'])

        const report = JSON.parse(logged.join('\n')) as DoctorReport
        const evidence = report.packages[0]?.packedValidation
        expect(evidence?.files).toContain('package.json')
        expect(evidence?.files).toContain('dist/index.js')
        expect(evidence?.publint).toEqual({ state: 'completed' })
        expect(evidence?.attw).toEqual({ state: 'completed' })
        // The profile travels too, so an absent finding is readable as a statement about scope.
        expect(evidence?.resolutions).toEqual(['node16-cjs', 'node16-esm'])
    }, 120_000)

    it('accepts repeated --package and keeps terminal output concise', async () => {
        const root = createWorkspace(['valid', 'untyped', 'broken'])
        const logged = captureStdout()

        await main([
            root,
            '--package',
            '@fixture/valid',
            '--package',
            '@fixture/untyped',
        ])

        const output = logged.join('\n')
        expect(output).toContain('Scanned 2 packages')
        expect(output).toContain('Read-only report: no files were changed.')
        // Selection still scopes the run when it arrives through the CLI.
        expect(output).not.toContain('@fixture/broken')
    }, 120_000)
})

type FixtureKind = 'broken' | 'unpackable' | 'untyped' | 'valid'

function captureStdout(): Array<string> {
    const logged: Array<string> = []
    vi.spyOn(console, 'log').mockImplementation((...args: Array<unknown>) => {
        logged.push(args.map((arg) => String(arg)).join(' '))
    })
    return logged
}

function codes(report: DoctorReport): ReadonlyArray<string> {
    return report.diagnostics.map((diagnostic) => diagnostic.code)
}

function conditions(format: 'cjs' | 'esm'): Record<string, string> {
    return Object.fromEntries([
        ['types', `./dist/index.d.${format === 'cjs' ? 'cts' : 'ts'}`],
        ['default', `./dist/index.${format === 'cjs' ? 'cjs' : 'js'}`],
    ])
}

/** A workspace whose root declares the package manager, so detection resolves from an ancestor as it does in a repo. */
function createWorkspace(kinds: ReadonlyArray<FixtureKind>): string {
    const root = mkdtempSync(path.join(tmpdir(), 'snail-doctor-cli-'))
    temporaryRoots.push(root)
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

    for (const kind of kinds) write(root, ...fixture(kind))
    return root
}

function find(report: DoctorReport, packageName: string) {
    return report.packages.find(
        (packageReport) => packageReport.packageName === packageName,
    )?.packedValidation
}

function fixture(kind: FixtureKind): [string, string] {
    const manifest = {
        broken: {
            exports: {
                '.': conditions('esm'),
                './missing': { import: './dist/missing.js' },
                './package.json': './package.json',
            },
        },
        unpackable: {
            // Pnpm refuses to pack a workspace range it cannot resolve without an install, which is a real
            // packing failure rather than a simulated one.
            dependencies: { '@fixture/never-installed': 'workspace:*' },
            exports: { '.': conditions('esm') },
        },
        untyped: { exports: { '.': './dist/index.js' } },
        valid: {
            exports: {
                '.': { import: conditions('esm'), require: conditions('cjs') },
                './package.json': './package.json',
            },
            main: './dist/index.cjs',
            types: './dist/index.d.cts',
        },
    }[kind]

    return [
        `packages/${kind}/package.json`,
        JSON.stringify({
            files: ['dist'],
            license: 'MIT',
            name: `@fixture/${kind}`,
            type: 'module',
            version: '1.0.0',
            ...manifest,
        }),
    ]
}

function names(report: DoctorReport): ReadonlyArray<string> {
    return report.packages.map((packageReport) => packageReport.packageName)
}

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

    // Every fixture package ships the same tiny surface; only its manifest differs.
    if (!file.endsWith('package.json') || file === 'package.json') return
    const dist = path.join(path.dirname(target), 'dist')
    mkdirSync(dist, { recursive: true })
    writeFileSync(path.join(dist, 'index.js'), 'export const value = 42\n')
    if (target.includes(`${path.sep}untyped${path.sep}`)) return
    writeFileSync(path.join(dist, 'index.cjs'), 'exports.value = 42\n')
    for (const declaration of ['index.d.ts', 'index.d.cts']) {
        writeFileSync(
            path.join(dist, declaration),
            'export declare const value: number\n',
        )
    }
}
