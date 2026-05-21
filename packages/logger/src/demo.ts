import { fileURLToPath } from 'node:url'
import { createLogger } from './logger.js'
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
    subheader,
} from './terminal.js'

export type LoggerDemoOptions = {
    terminalWidth?: number
}

export const buildLoggerDemo = (options: LoggerDemoOptions = {}): string => {
    const terminalWidth = options.terminalWidth ?? 72

    return [
        header('Snailicid3 Logger', {
            marker: '=',
            style: 'bright-cyan',
            terminalWidth: terminalWidth,
            width: 8,
        }),
        section('Terminal Helpers', {
            marker: '-|',
            style: 'magenta',
            terminalWidth: terminalWidth,
            width: '70%',
        }),
        step('Rules, kabobs, status pairs, and key/value rows'),
        line('-', {
            style: 'gray',
            terminalWidth: terminalWidth,
            width: '50%',
        }),
        kabob('build output', {
            invert: true,
            marker: '-',
            style: 'green',
            terminalWidth: terminalWidth,
            width: '60%',
        }),
        kvPair('package', '@snailicid3/logger', {
            delimiter: ': ',
            valueStyle: 'bright-cyan',
        }),
        kvPair('mode', 'demo', {
            delimiter: ': ',
            valueStyle: 'yellow',
        }),
        statusPair('workspace', 'dirty'),
        statusPair('tests', 'clean'),
        statusPair('pnpm', 'pnpm not installed'),
        subheader('Grey Ramp', 'bold-gray'),
        grayRamp(' ', 6),
        spacer(1),
        rule({
            marker: '=',
            style: 'bright-magenta',
            terminalWidth: terminalWidth,
            width: '60%',
        }),
    ].join('\n')
}

export const runLoggerDemo = (options: LoggerDemoOptions = {}): void => {
    const demoLogger = createLogger({
        level: 'trace',
        name: 'demo',
        time_stamp: true,
    })

    console.log(buildLoggerDemo(options))
    demoLogger.trace('trace message', { visible: true })
    demoLogger.debug('debug message')
    demoLogger.info('info message')
    demoLogger.warn('warn message')
    demoLogger.error('error message')
}

const isDirectRun = (): boolean =>
    process.argv[1] === fileURLToPath(import.meta.url)

if (isDirectRun()) {
    runLoggerDemo()
}
