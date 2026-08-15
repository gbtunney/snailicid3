import { describe, expect, it } from 'vitest'
import { DOCTOR_FIXTURES, findFixtureId } from './fixtures.js'

describe('Doctor fixture registry', () => {
    it('keeps fixture IDs and package/code matches unique', () => {
        const ids = DOCTOR_FIXTURES.map(({ id }) => id)
        const matches = DOCTOR_FIXTURES.flatMap(({ matches, packageName }) =>
            matches.map(
                ({ diagnosticCode }) => `${packageName}\u0000${diagnosticCode}`,
            ),
        )

        expect(new Set(ids).size).toBe(ids.length)
        expect(new Set(matches).size).toBe(matches.length)
    })

    it('labels evidence but does not treat unmatched diagnostics as fixtures', () => {
        expect(
            findFixtureId(
                '@snailicid3/logger',
                'EXPORT_TYPES_CONDITION_MISSING',
                [
                    'package.json#types -> ./dist/index.d.cts',
                    'package.json#exports["."] has no types condition',
                ],
            ),
        ).toBeUndefined()
        expect(
            findFixtureId(
                '@snailicid3/node-utils',
                'EXPORT_TYPES_CONDITION_MISSING',
                [
                    'package.json#types -> ./dist/index.d.cts',
                    'package.json#exports["."] has no types condition',
                ],
            ),
        ).toBeUndefined()

        expect(
            findFixtureId(
                '@snailicid3/example-package',
                'EXPORT_TARGET_MISSING',
                [
                    '. (import) -> ./dist/index.js',
                    './new (import) -> ./dist/new.js',
                ],
            ),
        ).toBeUndefined()
    })
})
