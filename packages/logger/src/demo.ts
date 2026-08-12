import ansis from 'ansis'
import { createLogger } from './logger.js'
import { createSpinner } from './spinner.js'
import { table } from './table.js'
import {
    grayRamp,
    header,
    kabob,
    kvPair,
    line,
    rule,
    section,
    spacer,
    statusPair,
    step,
    styleText,
    subheader,
} from './terminal.js'
import { terminalLink } from './utilities/ansi.js'

export type LoggerDemoOptions = {
    spinnerDurationMs?: number
    terminalWidth?: number
}

const colorSwatch = (name: string): string =>
    `${styleText('  ', `bg-${name}`)} ${styleText(name.padEnd(16), name)}`

const colorRows = (): string =>
    [
        ['red', 'bright-red'],
        ['yellow', 'bright-yellow'],
        ['green', 'bright-green'],
        ['cyan', 'bright-cyan'],
        ['blue', 'bright-blue'],
        ['magenta', 'bright-magenta'],
        ['white', 'gray'],
    ]
        .map(([left = '', right = '']) =>
            [colorSwatch(left), colorSwatch(right)].join('  '),
        )
        .join('\n')

const ANSI_16_RGB = [
    [0, 0, 0],
    [128, 0, 0],
    [0, 128, 0],
    [128, 128, 0],
    [0, 0, 128],
    [128, 0, 128],
    [0, 128, 128],
    [192, 192, 192],
    [128, 128, 128],
    [255, 0, 0],
    [0, 255, 0],
    [255, 255, 0],
    [0, 0, 255],
    [255, 0, 255],
    [0, 255, 255],
    [255, 255, 255],
] as const

const ansi256Rgb = (code: number): readonly [number, number, number] => {
    if (code < 16) return ANSI_16_RGB[code] ?? [0, 0, 0]
    if (code >= 232) {
        const gray = 8 + (code - 232) * 10
        return [gray, gray, gray]
    }

    const cubeIndex = code - 16
    const levels = [0, 95, 135, 175, 215, 255] as const
    return [
        levels[Math.floor(cubeIndex / 36)] ?? 0,
        levels[Math.floor((cubeIndex % 36) / 6)] ?? 0,
        levels[cubeIndex % 6] ?? 0,
    ]
}

const ansi256Cell = (code: number): string => {
    const [red, green, blue] = ansi256Rgb(code)
    const luminance = red * 0.299 + green * 0.587 + blue * 0.114
    const foreground = luminance >= 150 ? 16 : 231
    return ansis.bg(code).fg(foreground)(String(code).padStart(3))
}

const ansi256Table = (): string =>
    table(
        Array.from({ length: 16 }, (_, row) =>
            Array.from({ length: 16 }, (_, column) =>
                ansi256Cell(row * 16 + column),
            ),
        ),
        { border: false, padding: 0 },
    )

export const buildLoggerDemo = (options: LoggerDemoOptions = {}): string => {
    const terminalWidth = options.terminalWidth ?? 72

    return [
        header('🐌 Snail Terminal UI', {
            marker: '=',
            style: 'bright-cyan',
            terminalWidth: terminalWidth,
            width: 8,
        }),
        section('Rules and Sections', {
            marker: '-|',
            style: 'magenta',
            terminalWidth: terminalWidth,
            width: '70%',
        }),
        step('Percentage rule'),
        line('-', {
            style: 'gray',
            terminalWidth: terminalWidth,
            width: '50%',
        }),
        kabob('BUILD OUTPUT', {
            invert: true,
            marker: '-',
            style: 'green',
            terminalWidth: terminalWidth,
            width: '60%',
        }),
        kabob('FIXED WIDTH KITTEN', {
            marker: '-|',
            style: 'magenta',
            terminalWidth: terminalWidth,
            textStyle: 'bold',
            width: 8,
        }),
        line('~', {
            style: 'bright-blue',
            terminalWidth: terminalWidth,
            width: '20%',
        }),
        section('Width, Height, and Padding', {
            marker: '-|',
            style: 'bright-blue',
            terminalWidth: terminalWidth,
            width: '70%',
        }),
        step('auto width'),
        line('=', {
            style: 'gray',
            terminalWidth: terminalWidth,
            width: 'auto',
        }),
        step('percentage widths: 25% / 40% / 50%'),
        line('-', {
            style: 'cyan',
            terminalWidth: terminalWidth,
            width: '25%',
        }),
        line('~', {
            style: 'blue',
            terminalWidth: terminalWidth,
            width: '40%',
        }),
        line('=', {
            style: 'magenta',
            terminalWidth: terminalWidth,
            width: '50%',
        }),
        step('fixed width 12, repeated to height 2'),
        rule({
            height: 2,
            marker: '-|',
            style: 'yellow',
            terminalWidth: terminalWidth,
            width: 12,
        }),
        step('kabob padding: 0 / 1 / 4'),
        kabob('ZERO', {
            marker: '-',
            newline: false,
            padding: 0,
            style: 'gray',
            terminalWidth: terminalWidth,
            width: 6,
        }),
        kabob('ONE', {
            marker: '-',
            newline: false,
            padding: 1,
            style: 'cyan',
            terminalWidth: terminalWidth,
            width: 6,
        }),
        kabob('FOUR', {
            invert: true,
            marker: '-|',
            newline: false,
            padding: 4,
            style: 'magenta',
            terminalWidth: terminalWidth,
            width: 6,
        }),
        section('Status and Details', {
            marker: '-|',
            style: 'magenta',
            terminalWidth: terminalWidth,
            width: '70%',
        }),
        kvPair('package', '@snailicid3/logger', {
            delimiter: ': ',
            valueStyle: 'bright-cyan',
        }),
        kvPair('mode', 'demo', {
            delimiter: ': ',
            valueStyle: 'yellow',
        }),
        kvPair(
            'source',
            terminalLink(
                'Snailicid3 logger source',
                'https://github.com/gbtunney/snailicid3/tree/main/packages/logger',
            ),
            { delimiter: ': ', valueStyle: 'bright-cyan' },
        ),
        statusPair('workspace', 'dirty'),
        statusPair('tests', 'clean'),
        statusPair('pnpm', 'pnpm not installed'),
        statusPair('release', 'command failed (non-blocking)'),
        table(
            [
                ['workspace', styleText('dirty', 'yellow'), 'feature branch'],
                ['tests', styleText('passed', 'green'), '46 logger tests'],
                ['release', styleText('private', 'gray'), 'intentionally held'],
            ],
            { head: ['Check', 'Status', 'Detail'], preset: 'header' },
        ),
        section('Colors and Stuff', {
            marker: '-',
            style: 'orange',
            terminalWidth: terminalWidth,
            width: '50%',
        }),
        colorRows(),
        subheader('Grey Ramp  50 → 900', 'bold-gray'),
        grayRamp(' ', 5),
        kvPair('light alias', 'GREY.lt / gray-200', {
            valueStyle: 'grey-lt',
        }),
        kvPair('medium alias', 'GREY.md / gray-600', {
            valueStyle: 'grey-md',
        }),
        kvPair('dark alias', 'GREY.dk / gray-700', {
            valueStyle: 'grey-dk',
        }),
        subheader('ANSI 256 Color Index', 'bold-gray'),
        ansi256Table(),
        spacer(1),
        rule({
            marker: '=',
            style: 'bright-magenta',
            terminalWidth: terminalWidth,
            width: '60%',
        }),
        styleText('  🐌 Terminal presentation ready.', 'bold-green'),
    ].join('\n')
}

export const runLoggerDemo = async (
    options: LoggerDemoOptions = {},
): Promise<void> => {
    console.log(buildLoggerDemo(options))

    const spinner = createSpinner('Snail is checking the terminal UI...', {
        color: 'magenta',
        isEnabled: true,
        prefixText: '🐌',
        spinner: 'dots12',
    })
    const duration = options.spinnerDurationMs ?? 1200
    spinner.start()
    await new Promise<void>((resolve) => {
        setTimeout(resolve, Math.max(0, duration / 2))
    })
    spinner.setText('Snail found the pretty bits.')
    await new Promise<void>((resolve) => {
        setTimeout(resolve, Math.max(0, duration / 2))
    })
    spinner.persist('Demo ready')
}

/** Keep an animated spinner visible until the user presses Ctrl+C. */
export const runSpinnerDemo = async (): Promise<void> => {
    const spinner = createSpinner('kkkkSpinning until Ctrl+C...', {
        color: 'magenta',
        isEnabled: true,

        spinner: 'dots',
    })

    spinner.start()

    await new Promise<void>((resolve) => {
        process.once('SIGINT', () => {
            spinner.persist('Spinner stopped')
            resolve()
        })
    })
}

/** Demonstrate the separate timestamped severity logger. */
export const runLevelLoggerDemo = (): void => {
    const demoLogger = createLogger({
        level: 'trace',
        name: 'demo',
        time_stamp: true,
    })

    demoLogger.trace('trace message', { visible: true })
    demoLogger.debug('debug message')
    demoLogger.info('info message')
    demoLogger.warn('warn message')
    demoLogger.error('error message')
}
