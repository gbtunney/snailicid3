import { describe, expect, test } from 'vitest'
import { parseMaster } from './master.js'

describe('parseMaster()', () => {
    test.each([
        ['0b1010', 10],
        ['0o744', 484],
        ['0xFF', 255],
        ['3.14', 3.14],
        ['1e3', 1000],
        ['1.2e+3', 1200],
        ['10n', 10n],
    ] as const)('parses %s correctly', (input, expected) => {
        expect(parseMaster(input)).toEqual(expected)
    })

    test.each(['abc', '1e', '0x', '_10'] as const)(
        'rejects invalid %s',
        (input) => {
            expect(parseMaster(input)).toBeUndefined()
        },
    )
})

export {}
