import { afterEach, describe, expect, test, vi } from 'vitest'

import { main } from './snail-sh.js'

afterEach(() => {
    vi.restoreAllMocks()
})

describe('snail-sh dispatcher', () => {
    test('dispatches simple status output', () => {
        const output = vi.spyOn(console, 'log').mockImplementation(() => {})

        main(['success', 'Hook passed'])

        expect(output).toHaveBeenCalledWith(
            expect.stringContaining('Hook passed'),
        )
    })

    test('accepts hyphenated command aliases', () => {
        const output = vi.spyOn(console, 'log').mockImplementation(() => {})

        main(['status-pair', 'lint-staged', 'passed', 'success'])

        expect(output).toHaveBeenCalledWith(
            expect.stringContaining('lint-staged'),
        )
        expect(output).toHaveBeenCalledWith(expect.stringContaining('passed'))
    })

    test('schema-validates long kabob positionals', () => {
        const output = vi
            .spyOn(process.stdout, 'write')
            .mockImplementation(() => true)

        main([
            'kabob',
            '🐌 Running tests',
            '90%',
            'magenta',
            'true',
            '-|',
            '1',
            'false',
            'bold',
        ])

        expect(output).toHaveBeenCalledWith(
            expect.stringContaining('Running tests'),
        )
    })

    test('rejects unknown commands', () => {
        expect(() => {
            main(['wat'])
        }).toThrow('Unknown command: wat')
    })
})
