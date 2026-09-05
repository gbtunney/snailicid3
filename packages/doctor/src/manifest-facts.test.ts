import { afterEach, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { manifestFactsSchema } from './manifest-facts.js'
import { analyzePackage } from './manifest.js'
import type { DoctorDiagnostic } from './types.js'

const temporaryRoots: Array<string> = []

afterEach(() => {
    for (const root of temporaryRoots.splice(0)) {
        rmSync(root, { force: true, recursive: true })
    }
})

/** Everything a publishable package is expected to declare, so a test can omit exactly one field on purpose. */
const COMPLETE_METADATA = {
    author: 'Fixture Author',
    description: 'A fixture package used by Doctor tests.',
    license: 'MIT',
    repository: { type: 'git', url: 'https://example.test/repo' },
} as const

describe('canonical manifest facts', () => {
    it('reports observable identity without interpreting it', () => {
        const root = createPackage({
            ...COMPLETE_METADATA,
            bin: { 'gbt-one': './cli.js', 'gbt-two': './cli.js' },
            name: '@fixture/facts',
            publishConfig: { access: 'restricted' },
            type: 'module',
            version: '2.3.4',
        })

        const facts = analyzePackage(root).manifestFacts

        expect(manifestFactsSchema.safeParse(facts).success).toBe(true)
        expect(facts).toEqual({
            access: 'restricted',
            // Sorted, so the inventory is stable regardless of manifest key order.
            binNames: ['gbt-one', 'gbt-two'],
            moduleType: 'module',
            name: '@fixture/facts',
            private: false,
            repository: { url: 'https://example.test/repo' },
            version: '2.3.4',
        })
    })

    it('records an absent private field as not private', () => {
        const root = createPackage({
            ...COMPLETE_METADATA,
            name: '@fixture/public',
            version: '1.0.0',
        })

        expect(analyzePackage(root).manifestFacts?.private).toBe(false)
    })

    it('treats a 0.0.0 version as a valid fact rather than a defect', () => {
        const root = createPackage({
            ...COMPLETE_METADATA,
            name: '@fixture/zero',
            version: '0.0.0',
        })

        const report = analyzePackage(root)

        expect(report.manifestFacts?.version).toBe('0.0.0')
        expect(codes(report.diagnostics)).toEqual([])
    })

    it('never publishes release status, eligibility or hold state', () => {
        const root = createPackage({
            ...COMPLETE_METADATA,
            name: '@fixture/facts-only',
            private: true,
            version: '1.0.0',
        })

        // Doctor reports what a manifest declares. What that means for a release needs intent and registry state
        // Doctor cannot see, so the facts surface deliberately carries no verdict for a consumer to mistake for one.
        const factKeys = Object.keys(analyzePackage(root).manifestFacts ?? {})
        for (const forbidden of [
            'role',
            'completenessVerdict',
            'eligible',
            'hold',
            'status',
            'publishable',
        ]) {
            expect(factKeys).not.toContain(forbidden)
        }
    })
})

describe('malformed fields stay independent findings', () => {
    it('keeps a malformed field out of the facts and reports it instead', () => {
        const root = createPackage({
            ...COMPLETE_METADATA,
            name: 'Not A Valid Name',
            version: '1.0.0',
        })

        const report = analyzePackage(root)

        expect(report.manifestFacts?.name).toBeUndefined()
        expect(codes(report.diagnostics)).toContain('MANIFEST_FIELD_INVALID')
        expect(
            report.diagnostics
                .filter(({ code }) => code === 'MANIFEST_FIELD_INVALID')
                .flatMap(({ evidence }) => evidence),
        ).toContain('package.json#name')
    })

    it('does not let one malformed field hide every other finding', () => {
        const root = createPackage(
            {
                ...COMPLETE_METADATA,
                exports: { '.': './dist/missing.js' },
                name: '@fixture/partly-broken',
                version: 'not-a-version',
            },
            { './other.js': 'export {}\n' },
        )

        const report = analyzePackage(root)

        // The version is unusable, and the export target is still checked and still reported.
        expect(codes(report.diagnostics)).toContain('MANIFEST_FIELD_INVALID')
        expect(codes(report.diagnostics)).toContain('EXPORT_TARGET_MISSING')
        expect(report.manifestFacts).toBeDefined()
    })

    it('reports an unreadable manifest without inventing facts', () => {
        const root = mkdtempSync(path.join(tmpdir(), 'doctor-facts-'))
        temporaryRoots.push(root)
        writeFileSync(path.join(root, 'package.json'), '{ not json')

        const report = analyzePackage(root)

        expect(codes(report.diagnostics)).toEqual(['MANIFEST_READ_ERROR'])
        expect(report.manifestFacts).toBeUndefined()
    })
})

describe('completeness follows how the package participates', () => {
    it('reports each missing publishable field independently', () => {
        const root = createPackage({ name: '@fixture/bare', version: '1.0.0' })

        const missing = analyzePackage(root)
            .diagnostics.filter(
                ({ code }) => code === 'MANIFEST_METADATA_MISSING',
            )
            .flatMap(({ evidence }) => evidence)

        // Four separate diagnostics rather than one combined finding, so each field can be tracked on its own.
        expect(missing).toEqual([
            'package.json#description',
            'package.json#license',
            'package.json#author',
            'package.json#repository',
        ])
    })

    it('does not ask a private package for publication metadata', () => {
        const root = createPackage({
            name: '@fixture/internal',
            private: true,
            version: '1.0.0',
        })

        expect(codes(analyzePackage(root).diagnostics)).not.toContain(
            'MANIFEST_METADATA_MISSING',
        )
    })

    it('does not ask a workspace root for publication metadata', () => {
        const root = createPackage({ name: '@fixture/root', version: '0.0.0' })
        writeFileSync(
            path.join(root, 'pnpm-workspace.yaml'),
            "packages:\n  - 'packages/*'\n",
        )

        expect(codes(analyzePackage(root).diagnostics)).not.toContain(
            'MANIFEST_METADATA_MISSING',
        )
    })

    it('treats a package declaring a bin as publishable', () => {
        const root = createPackage(
            {
                bin: { 'gbt-tool': './cli.js' },
                name: '@fixture/cli',
                version: '1.0.0',
            },
            { './cli.js': '#!/usr/bin/env node\n' },
        )

        expect(codes(analyzePackage(root).diagnostics)).toContain(
            'MANIFEST_METADATA_MISSING',
        )
    })

    it('asks for repository.directory only inside a monorepo', () => {
        const standalone = createPackage({
            ...COMPLETE_METADATA,
            name: '@fixture/standalone',
            version: '1.0.0',
        })
        const member = createWorkspaceMember()

        expect(evidenceFor(standalone)).not.toContain(
            'package.json#repository.directory',
        )
        expect(evidenceFor(member)).toContain(
            'package.json#repository.directory',
        )
    })
})

describe('contradictory publication fields', () => {
    it('reports private alongside declared publish access', () => {
        const root = createPackage({
            name: '@fixture/contradictory',
            private: true,
            publishConfig: { access: 'public' },
            version: '1.0.0',
        })

        const report = analyzePackage(root)

        expect(codes(report.diagnostics)).toContain(
            'MANIFEST_PUBLICATION_FIELDS_CONFLICT',
        )
        // The contradiction is reported; whether the package may publish is not decided here.
        expect(report.manifestFacts?.private).toBe(true)
        expect(report.manifestFacts?.access).toBe('public')
    })

    it('accepts publish access on a package that is not private', () => {
        const root = createPackage({
            ...COMPLETE_METADATA,
            name: '@fixture/published',
            publishConfig: { access: 'public' },
            version: '1.0.0',
        })

        expect(codes(analyzePackage(root).diagnostics)).not.toContain(
            'MANIFEST_PUBLICATION_FIELDS_CONFLICT',
        )
    })
})

function codes(
    diagnostics: ReadonlyArray<DoctorDiagnostic>,
): ReadonlyArray<string> {
    return diagnostics.map(({ code }) => code)
}

function createPackage(
    manifest: Record<string, unknown>,
    files: Readonly<Record<string, string>> = {},
): string {
    const root = mkdtempSync(path.join(tmpdir(), 'doctor-facts-'))
    temporaryRoots.push(root)
    writeFileSync(
        path.join(root, 'package.json'),
        JSON.stringify(manifest, undefined, 2),
    )

    for (const [relativePath, contents] of Object.entries(files)) {
        const target = path.resolve(root, relativePath)
        mkdirSync(path.dirname(target), { recursive: true })
        writeFileSync(target, contents)
    }

    return root
}

/** A package inside a pnpm workspace, where `repository.directory` is what locates it. */
function createWorkspaceMember(): string {
    const root = mkdtempSync(path.join(tmpdir(), 'doctor-facts-workspace-'))
    temporaryRoots.push(root)
    writeFileSync(
        path.join(root, 'pnpm-workspace.yaml'),
        "packages:\n  - 'packages/*'\n",
    )

    const member = path.join(root, 'packages/member')
    mkdirSync(member, { recursive: true })
    writeFileSync(
        path.join(member, 'package.json'),
        JSON.stringify({
            ...COMPLETE_METADATA,
            name: '@fixture/member',
            version: '1.0.0',
        }),
    )
    return member
}

function evidenceFor(packageRoot: string): ReadonlyArray<string> {
    return analyzePackage(packageRoot).diagnostics.flatMap(
        ({ evidence }) => evidence,
    )
}
