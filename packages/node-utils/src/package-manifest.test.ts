import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
    packageIdentitySchema,
    packageNameSchema,
    packageVersionSchema,
    readPackageManifest,
} from './package-manifest.js'

function writeManifest(contents: string): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'snail-manifest-'))
    const file = path.join(dir, 'package.json')

    writeFileSync(file, contents)

    return file
}

describe('packageNameSchema', () => {
    it('accepts scoped and unscoped names', () => {
        expect(packageNameSchema.safeParse('@snailicid3/config').success).toBe(
            true,
        )
        expect(packageNameSchema.safeParse('lodash').success).toBe(true)
    })

    it('rejects names npm would reject', () => {
        expect(packageNameSchema.safeParse('Not Valid').success).toBe(false)
        expect(packageNameSchema.safeParse('').success).toBe(false)
    })
})

describe('packageVersionSchema', () => {
    it('accepts prerelease and build metadata', () => {
        expect(packageVersionSchema.safeParse('1.2.3').success).toBe(true)
        expect(packageVersionSchema.safeParse('1.2.3-rc.1').success).toBe(true)
        expect(packageVersionSchema.safeParse('1.2.3+build.5').success).toBe(
            true,
        )
    })

    it('rejects a non-semver version', () => {
        expect(packageVersionSchema.safeParse('1.2').success).toBe(false)
    })
})

describe('packageIdentitySchema', () => {
    it('parses a manifest carrying only a name', () => {
        // The point of the identity layer: never throw on a manifest npm would accept.
        const parsed = packageIdentitySchema.safeParse({ name: 'minimal' })

        expect(parsed.success).toBe(true)
        expect(parsed.success && parsed.data.version).toBeUndefined()
    })

    it('accepts an author without an email, and no repository', () => {
        // SchemaBasePackage in build-config required both; a public banner reader must not.
        expect(
            packageIdentitySchema.safeParse({
                author: { name: 'Someone' },
                name: 'sparse',
                version: '0.1.0',
            }).success,
        ).toBe(true)
    })

    it('accepts a string author and a string repository', () => {
        expect(
            packageIdentitySchema.safeParse({
                author: 'Someone <a@b.c>',
                name: 'strings',
                repository: 'github:owner/repo',
            }).success,
        ).toBe(true)
    })

    it('preserves unknown fields', () => {
        const parsed = packageIdentitySchema.parse({
            name: 'extra',
            scripts: { build: 'tsc' },
        })

        expect(parsed['scripts']).toEqual({ build: 'tsc' })
    })

    it('accepts a manifest with no name, leaving presence to the caller', () => {
        // Doctor reports a missing name as MANIFEST_NAME_MISSING; it cannot do that if parsing
        // rejects the manifest first. resolvePackageManager likewise reads one field and does not
        // care about identity.
        const parsed = packageIdentitySchema.safeParse({ version: '1.0.0' })

        expect(parsed.success).toBe(true)
        expect(parsed.success && parsed.data.name).toBeUndefined()
    })

    it('still rejects a name that is present but malformed', () => {
        expect(
            packageIdentitySchema.safeParse({ name: 'Not Valid' }).success,
        ).toBe(false)
    })

    it('trims surrounding whitespace from a name', () => {
        expect(
            packageIdentitySchema.parse({ name: '  @scope/thing  ' }).name,
        ).toBe('@scope/thing')
    })
})

describe('readPackageManifest', () => {
    it('reads a valid manifest', () => {
        const file = writeManifest(
            JSON.stringify({ name: '@scope/thing', version: '2.0.0' }),
        )
        const result = readPackageManifest(file)

        expect(result.success).toBe(true)
        expect(result.success && result.data.name).toBe('@scope/thing')
    })

    it('distinguishes missing from malformed', () => {
        const missing = readPackageManifest(
            path.join(tmpdir(), 'definitely-absent', 'package.json'),
        )

        expect(missing.success).toBe(false)
        expect(!missing.success && missing.reason).toBe('missing')

        const malformed = readPackageManifest(writeManifest('{ not json'))

        expect(malformed.success).toBe(false)
        // Malformed must not look like absence — that conflation is what hid real defects before.
        expect(!malformed.success && malformed.reason).toBe('invalid')
    })

    it('reports an invalid name rather than throwing', () => {
        const result = readPackageManifest(
            writeManifest(JSON.stringify({ name: 'Not Valid' })),
        )

        expect(result.success).toBe(false)
        expect(!result.success && result.reason).toBe('invalid')
    })

    it('parses every manifest in this repository', () => {
        // Guards the leniency claim against real input rather than fixtures.
        const repoRoot = path.resolve(process.cwd(), '../..')

        for (const relative of [
            'package.json',
            'packages/config/package.json',
            'packages/node-utils/package.json',
            'apps/playground/package.json',
        ]) {
            const result = readPackageManifest(path.join(repoRoot, relative))

            expect(
                result.success,
                `${relative}: ${result.success ? '' : result.error}`,
            ).toBe(true)
        }
    })
})
