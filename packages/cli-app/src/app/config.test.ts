import { describe, expect, it } from 'vitest'
import { parsePackageJson } from './config.js'

describe('parsePackageJson', () => {
    it('derives app identity from a manifest', () => {
        expect(
            parsePackageJson({
                description: 'Example CLI',
                name: '@snailicid3/example-package',
                version: '1.2.3',
            }),
        ).toEqual({
            description: 'Example CLI',
            // The scope separator is stripped rather than hyphenated — unchanged existing behaviour of
            // the shared hyphenate helper, pinned here so the identity migration cannot alter it.
            name: 'snailicid3example-package',
            version: '1.2.3',
        })
    })

    it('falls back to 0.0.0 when the manifest has no version', () => {
        expect(parsePackageJson({ name: 'tool' })).toEqual({
            name: 'tool',
            version: '0.0.0',
        })
    })

    it('accepts a sparse manifest that npm would accept', () => {
        // Shape is validated, not completeness: extra fields and absent optional fields must both
        // survive, because a real package.json carries far more than app identity.
        expect(
            parsePackageJson({
                dependencies: { zod: '^4.0.0' },
                name: 'tool',
                scripts: { build: 'tsdown' },
                version: '0.1.0',
            }),
        ).toEqual({ name: 'tool', version: '0.1.0' })
    })

    it('rejects a manifest with no usable name', () => {
        expect(parsePackageJson({ version: '1.0.0' })).toBeUndefined()
        expect(parsePackageJson({})).toBeUndefined()
    })

    it('rejects a version that is not semver', () => {
        expect(
            parsePackageJson({ name: 'tool', version: 'not-a-version' }),
        ).toBeUndefined()
    })
})
