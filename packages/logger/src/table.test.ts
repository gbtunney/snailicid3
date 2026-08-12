import { describe, expect, test } from 'vitest'

import { table } from './table.js'
import { stripAnsi } from './terminal.js'

describe('table', () => {
    test('renders headers and rows', () => {
        const output = table(
            [
                ['workspace', 'dirty'],
                ['tests', 'passed'],
            ],
            { head: ['Check', 'Status'] },
        )

        expect(output).toContain('Check')
        expect(output).toContain('workspace')
        expect(output).toContain('passed')
    })

    test('can omit borders and cell padding', () => {
        const output = table(
            [
                ['a', 'b'],
                ['c', 'd'],
            ],
            { border: false, padding: 0 },
        )

        expect(output).toBe('ab\ncd')
    })

    test('renders the header preset without body borders', () => {
        const output = table([['workspace', 'clean']], {
            head: ['Check', 'Status'],
            preset: 'header',
        })
        const plainOutput = stripAnsi(output)

        expect(plainOutput).toContain(' Check ')
        expect(plainOutput).toContain(' Status ')
        expect(plainOutput).toContain('workspace')
        expect(plainOutput).not.toContain('│')
        expect(plainOutput).not.toContain('─')
    })
})
