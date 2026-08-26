import { afterEach, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createPackCandidate, withPackCandidate } from './pack-candidate.js'
import { validatePackedCandidate } from './packed-validation.js'

const temporaryRoots: Array<string> = []

afterEach(() => {
    for (const root of temporaryRoots.splice(0)) {
        rmSync(root, { force: true, recursive: true })
    }
})

describe('packed candidate validation', () => {
    it('validates a well-formed package without reporting resolution problems', async () => {
        const result = await withPackCandidate(
            { packageRoot: createSourcePackage() },
            validatePackedCandidate,
        )

        expect(result.publint).toEqual({ state: 'completed' })
        expect(result.attw).toEqual({ state: 'completed' })
        expect(
            result.diagnostics.filter(
                (diagnostic) => diagnostic.code === 'ATTW_RESOLUTION_PROBLEM',
            ),
        ).toEqual([])
        expect(
            result.diagnostics.filter(
                (diagnostic) => diagnostic.code === 'PUBLINT_ERROR',
            ),
        ).toEqual([])
    }, 120_000)

    it('reports actionable evidence for an export route with no packed file', async () => {
        const result = await withPackCandidate(
            {
                packageRoot: createSourcePackage({
                    exports: {
                        '.': {
                            import: './dist/index.js',
                            types: './dist/index.d.ts',
                        },
                        './missing': {
                            import: './dist/missing.js',
                            types: './dist/missing.d.ts',
                        },
                    },
                }),
            },
            validatePackedCandidate,
        )

        const publintFindings = result.diagnostics.filter((diagnostic) =>
            diagnostic.code.startsWith('PUBLINT_'),
        )
        expect(publintFindings.length).toBeGreaterThan(0)
        // The evidence names the offending manifest route, so the finding is actionable without re-running
        // the tool against the package by hand.
        const evidence = publintFindings.flatMap(
            (diagnostic) => diagnostic.evidence,
        )
        expect(evidence).toContain('publint:FILE_DOES_NOT_EXIST')
        expect(evidence).toContainEqual(
            expect.stringContaining('exports["./missing"]'),
        )
        expect(result.publint).toEqual({ state: 'completed' })
    }, 120_000)

    it('reports legacy resolution problems only when legacy support is asked for', async () => {
        const packageRoot = createSourcePackage()
        const [defaultProfile, withLegacy] = await Promise.all([
            withPackCandidate({ packageRoot }, (candidate) =>
                validatePackedCandidate(candidate),
            ),
            withPackCandidate({ packageRoot }, (candidate) =>
                validatePackedCandidate(candidate, {
                    resolutions: ['node10'],
                }),
            ),
        ])

        // The subpath export is genuinely unreachable under node10, so the profile decides whether that counts
        // against this package rather than the finding being suppressed outright.
        expect(defaultProfile.resolutions).toEqual(['node16-cjs', 'node16-esm'])
        expect(attwFindings(defaultProfile)).toEqual([])
        expect(
            attwFindings(withLegacy).flatMap((finding) => finding.evidence),
        ).toContain('attw:NoResolution')
    }, 120_000)

    it('exposes the packed file inventory of the shared candidate', async () => {
        const candidate = createPackCandidate({
            packageRoot: createSourcePackage(),
        })
        temporaryRoots.push(candidate.artifactRoot)

        try {
            expect(candidate.files).toContain('package.json')
            expect(candidate.files).toContain('dist/index.js')
            expect(candidate.files).toContain('dist/sub.d.cts')
            expect(candidate.packageName).toBe('@fixture/valid')

            const result = await validatePackedCandidate(candidate)
            // Both collectors describe the same artifact, so the inventory travels with the evidence.
            expect(result.files).toEqual(candidate.files)
        } finally {
            candidate.dispose()
        }
    }, 120_000)

    it('removes its temporary directories once the collectors are done', () => {
        const candidate = createPackCandidate({
            packageRoot: createSourcePackage(),
        })
        const { artifactRoot } = candidate
        candidate.dispose()

        expect(existsPath(artifactRoot)).toBe(false)
    })
})

/**
 * Condition order is load-bearing, so it is built rather than written as a literal: `types` must resolve first and
 * `default` last, which is the opposite of the alphabetical order the repository's lint applies to object keys.
 */
function attwFindings(result: {
    diagnostics: ReadonlyArray<{
        code: string
        evidence: ReadonlyArray<string>
    }>
}) {
    return result.diagnostics.filter(
        (diagnostic) => diagnostic.code === 'ATTW_RESOLUTION_PROBLEM',
    )
}

function conditions(
    entry: string,
    format: 'cjs' | 'esm',
): Record<string, string> {
    return Object.fromEntries([
        ['types', `./dist/${entry}.d.${format === 'cjs' ? 'cts' : 'ts'}`],
        ['default', `./dist/${entry}.${format === 'cjs' ? 'cjs' : 'js'}`],
    ])
}

function createSourcePackage(manifest: Record<string, unknown> = {}): string {
    const root = mkdtempSync(path.join(tmpdir(), 'doctor-pack-source-'))
    temporaryRoots.push(root)
    write(
        root,
        'package.json',
        JSON.stringify({
            exports: {
                '.': {
                    import: conditions('index', 'esm'),
                    require: conditions('index', 'cjs'),
                },
                './package.json': './package.json',
                './sub': {
                    import: conditions('sub', 'esm'),
                    require: conditions('sub', 'cjs'),
                },
            },
            files: ['dist'],
            license: 'MIT',
            main: './dist/index.cjs',
            name: '@fixture/valid',
            type: 'module',
            types: './dist/index.d.cts',
            version: '1.0.0',
            ...manifest,
        }),
    )
    for (const entry of ['index', 'sub']) {
        write(root, `dist/${entry}.js`, `export const ${entry} = 42\n`)
        write(root, `dist/${entry}.cjs`, `exports.${entry} = 42\n`)
        write(
            root,
            `dist/${entry}.d.ts`,
            `export declare const ${entry}: number\n`,
        )
        write(
            root,
            `dist/${entry}.d.cts`,
            `export declare const ${entry}: number\n`,
        )
    }
    return root
}

function existsPath(target: string): boolean {
    try {
        rmSync(target, { recursive: true })
        return true
    } catch {
        return false
    }
}

function write(root: string, file: string, contents: string): void {
    const target = path.join(root, file)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, contents)
}
