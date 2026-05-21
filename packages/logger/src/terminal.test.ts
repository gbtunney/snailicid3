import { describe, expect, test } from 'vitest'
import { buildLoggerDemo } from './demo.js'
import {
    buildRule,
    header,
    kabob,
    kvPair,
    line,
    repeatRule,
    resolveWidth,
    rule,
    section,
    spacer,
    statusPair,
    statusStyleForLevel,
    statusStyleForValue,
    step,
    stripAnsi,
    subheader,
    visibleLength,
} from './terminal.js'
import { logger } from './index.js'

describe('terminal width and rule helpers', () => {
    test('resolves auto, fixed, and percentage widths', () => {
        expect(resolveWidth('auto', 120)).toBe(120)
        expect(resolveWidth(12, 120)).toBe(12)
        expect(resolveWidth('12', 120)).toBe(12)
        expect(resolveWidth('50%', 120)).toBe(60)
    })

    test('builds single and multi-character rules', () => {
        expect(buildRule('-', 5)).toBe('-----')
        expect(buildRule('-|', 7)).toBe('-|-|-|-')
        expect(buildRule('', 3)).toBe('---')
    })

    test('repeats rules vertically', () => {
        expect(repeatRule('=', 3, 2)).toBe('===\n===')
    })

    test('rule and line return printable strings', () => {
        expect(rule({ marker: '=', terminalWidth: 5 })).toBe('=====\n')
        expect(line('-', { width: 4 })).toBe('----')
    })

    test('creates spacers', () => {
        expect(spacer(2)).toBe('\n\n')
        expect(spacer(0)).toBe('\n')
    })
})

describe('terminal text blocks', () => {
    test('builds kabob section markers', () => {
        const output = kabob('Section', {
            marker: '-',
            newline: false,
            padding: 1,
            terminalWidth: 20,
            width: 'auto',
        })

        expect(stripAnsi(output)).toBe('----- Section ------')
        expect(visibleLength(output)).toBe(20)
    })

    test('supports fixed side widths for kabob', () => {
        const output = kabob('Hi', {
            marker: '*',
            newline: false,
            padding: 1,
            terminalWidth: 80,
            width: 3,
        })

        expect(stripAnsi(output)).toBe('*** Hi ***')
    })

    test('builds headers and sections', () => {
        expect(stripAnsi(header('Build', { width: 3 }))).toBe(
            '\n=== Build ===\n',
        )
        expect(stripAnsi(section('Tests', { terminalWidth: 16 }))).toContain(
            'Tests',
        )
    })

    test('builds subheaders and steps', () => {
        expect(stripAnsi(subheader('Details'))).toBe('\nDetails\n')
        expect(stripAnsi(step('Install'))).toBe('  -> Install')
    })
})

describe('terminal key/value helpers', () => {
    test('formats key/value pairs', () => {
        const output = stripAnsi(
            kvPair('package', 'snailicid3', {
                delimiter: ': ',
                keyWidth: 10,
            }),
        )

        expect(output).toBe('package    : snailicid3')
    })

    test('maps status values and levels to styles', () => {
        expect(statusStyleForValue('clean')).toBe('green')
        expect(statusStyleForValue('dirty')).toBe('yellow')
        expect(statusStyleForValue('pnpm not installed')).toBe('red')
        expect(statusStyleForLevel('success')).toBe('green')
        expect(statusStyleForLevel('warn')).toBe('yellow')
        expect(statusStyleForLevel('fatal')).toBe('bg-red')
    })

    test('formats status pairs', () => {
        const output = stripAnsi(
            statusPair('workspace', 'dirty', {
                delimiter: ': ',
                keyWidth: 10,
            }),
        )

        expect(output).toBe('workspace  : dirty')
    })
})

describe('logger namespace terminal helpers', () => {
    test('exposes shell-inspired helpers on logger', () => {
        expect(logger.buildRule('=', 4)).toBe('====')
        expect(
            stripAnsi(logger.kabob('Demo', { terminalWidth: 12 })),
        ).toContain('Demo')
        expect(stripAnsi(logger.statusPair('tests', 'clean'))).toContain(
            'clean',
        )
    })
})

describe('logger demo', () => {
    test('builds a printable demo string', () => {
        const output = stripAnsi(buildLoggerDemo({ terminalWidth: 48 }))

        expect(output).toContain('Snailicid3 Logger')
        expect(output).toContain('Terminal Helpers')
        expect(output).toContain('@snailicid3/logger')
        expect(output).toContain('workspace')
        expect(output).toContain('tests')
    })
})
