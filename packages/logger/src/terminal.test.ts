import { describe, expect, test } from 'vitest'
import { buildLoggerDemo } from './demo.js'
import {
    block,
    buildRule,
    GREY_RAMP,
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
    styleText,
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

    test('wraps content with exact clean spacing', () => {
        expect(block('\n\nDetails\n\n')).toBe('\nDetails\n')
        expect(block('Details', { after: 2, before: 0 })).toBe('Details\n\n')
    })

    test('builds the default and custom gray ramps', () => {
        expect(GREY_RAMP).toHaveLength(10)
        expect(visibleLength(logger.greyRamp(' ', 2))).toBe(20)
        expect(visibleLength(logger.grayRamp('x', 3, ['white', 'black']))).toBe(
            6,
        )
    })

    test('accepts CSS names and gray convenience aliases as style strings', () => {
        expect(stripAnsi(styleText('css', 'rebeccapurple'))).toBe('css')
        expect(stripAnsi(styleText('light', 'grey-lt'))).toBe('light')
        expect(stripAnsi(styleText('middle', 'bg-grey-600'))).toBe('middle')
        expect(stripAnsi(styleText('dark', 'dark-grey'))).toBe('dark')
        expect(styleText('plain', 'not-a-real-color')).toBe('plain')
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

    test('fits percentage kabobs around text and padding', () => {
        const compact = kabob('Hi', {
            newline: false,
            padding: 1,
            terminalWidth: 40,
            width: '50%',
        })
        const padded = kabob('Longer label', {
            newline: false,
            padding: 3,
            terminalWidth: 40,
            width: '75%',
        })

        expect(visibleLength(compact)).toBe(20)
        expect(visibleLength(padded)).toBe(30)
    })

    test('subtracts text and padding from 100% kabob rule width', () => {
        const output = kabob('Build output', {
            newline: false,
            padding: 3,
            terminalWidth: 48,
            width: '100%',
        })
        const plainOutput = stripAnsi(output)
        const ruleWidth = 48 - 'Build output'.length - 3 * 2

        expect(visibleLength(output)).toBe(48)
        expect(
            plainOutput.startsWith('-'.repeat(Math.floor(ruleWidth / 2))),
        ).toBe(true)
        expect(plainOutput.endsWith('-'.repeat(Math.ceil(ruleWidth / 2)))).toBe(
            true,
        )
    })

    test.each([
        ['A', 0, 24],
        ['Short', 1, 32],
        ['A medium section title', 3, 48],
        ['A considerably longer section title', 5, 72],
    ])(
        'keeps 100%% width for text %j with padding %i',
        (text, padding, terminalWidth) => {
            const output = kabob(text, {
                newline: false,
                padding,
                terminalWidth,
                width: '100%',
            })

            expect(visibleLength(output)).toBe(terminalWidth)
        },
    )

    test('keeps a 100% section line at the terminal width', () => {
        const output = stripAnsi(
            section('A longer section title', {
                terminalWidth: 52,
                width: '100%',
            }),
        )
        const sectionLine = output.split('\n').find((value) => value !== '')

        expect(sectionLine).toHaveLength(52)
    })

    test('keeps auto kabobs within terminal width as content changes', () => {
        const compact = kabob('Hi', {
            newline: false,
            padding: 0,
            terminalWidth: 24,
        })
        const padded = kabob('Long label', {
            newline: false,
            padding: 3,
            terminalWidth: 24,
        })

        expect(visibleLength(compact)).toBe(24)
        expect(visibleLength(padded)).toBe(24)
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

        expect(output).toContain('Snail Terminal UI')
        expect(output).toContain('Rules and Sections')
        expect(output).toContain('Width, Height, and Padding')
        expect(output).toContain('percentage widths: 25% / 40% / 50%')
        expect(output).toContain('kabob padding: 0 / 1 / 4')
        expect(output).toContain('Colors and Stuff')
        expect(output).toContain('Grey Ramp')
        expect(output).toContain('ANSI 256 Color Index')
        expect(output).toContain('255')
        expect(output).toContain('Terminal presentation ready')
        expect(output).toContain('@snailicid3/logger')
        expect(output).toContain('workspace')
        expect(output).toContain('tests')
    })
})
