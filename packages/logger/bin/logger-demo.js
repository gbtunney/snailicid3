#!/usr/bin/env node
import chalk from 'chalk'
import dayjs from 'dayjs'

const terminalWidth = Number.parseInt(process.env.COLUMNS ?? '', 10) || 72

const buildRule = (marker = '-', width = 40) => {
    const value = marker.length > 0 ? marker : '-'
    if (value.length === 1) return value.repeat(width)

    let output = ''
    while (output.length < width) output += value
    return output.slice(0, width)
}

const resolveWidth = (width = 'auto') => {
    const value = String(width).trim()
    if (value === '' || value === 'auto') return terminalWidth
    if (value.endsWith('%')) {
        return Math.floor((terminalWidth * Number.parseInt(value, 10)) / 100)
    }
    return Number.parseInt(value, 10) || terminalWidth
}

const line = (marker = '-', width = 'auto', color = 'gray') =>
    chalk[color]?.(buildRule(marker, resolveWidth(width))) ??
    buildRule(marker, resolveWidth(width))

const kabob = (
    text,
    {
        color = 'cyan',
        invert = false,
        marker = '-',
        padding = 1,
        width = 'auto',
    } = {},
) => {
    const middleWidth = text.length + padding * 2
    const availableWidth = Math.max(0, terminalWidth - middleWidth)
    const totalRuleWidth =
        String(width).endsWith('%') || width === 'auto'
            ? Math.min(resolveWidth(width), availableWidth)
            : Number(width) * 2
    const leftWidth = Math.floor(totalRuleWidth / 2)
    const rightWidth = totalRuleWidth - leftWidth
    const center = `${' '.repeat(padding)}${invert ? chalk.inverse(text) : text}${' '.repeat(padding)}`
    const output = `${buildRule(marker, leftWidth)}${center}${buildRule(marker, rightWidth)}`

    return chalk[color]?.(output) ?? output
}

const header = (message, color = 'cyan') =>
    chalk[color](`\n${buildRule('=', 8)} ${message} ${buildRule('=', 8)}\n`)

const section = (message, color = 'magenta') =>
    `\n${kabob(message, { color, marker: '-|', width: '70%' })}\n`

const kvPair = (key, value, color = 'gray') =>
    `${chalk.gray(key.padEnd(24))} : ${chalk[color]?.(String(value)) ?? value}`

const statusColor = (value) => {
    switch (value) {
        case 'clean':
            return 'green'
        case 'dirty':
            return 'yellow'
        case 'pnpm not installed':
            return 'red'
        default:
            return 'gray'
    }
}

const statusPair = (key, value) => kvPair(key, value, statusColor(value))

const log = (level, color, ...args) => {
    const label = chalk[color].bold(` ===> ${level.toUpperCase()} `)
    const time = chalk.italic(dayjs().format('hh:mm:ss'))
    console.log(label, time, '[demo]', ...args)
}

console.log(header('Snailicid3 Logger', 'cyan'))
console.log(section('Terminal Helpers', 'magenta'))
console.log(chalk.bold('  -> Rules, kabobs, status pairs, and key/value rows'))
console.log(line('-', '50%', 'gray'))
console.log(kabob('build output', { color: 'green', invert: true, width: '60%' }))
console.log(kvPair('package', '@snailicid3/logger', 'cyan'))
console.log(kvPair('mode', 'demo', 'yellow'))
console.log(statusPair('workspace', 'dirty'))
console.log(statusPair('tests', 'clean'))
console.log(statusPair('pnpm', 'pnpm not installed'))
console.log(chalk.gray('\nGrey Ramp'))
console.log(
    chalk.bgWhite('      ') +
        chalk.bgGray('      ') +
        chalk.bgBlack('      ') +
        chalk.reset(''),
)
console.log(line('=', '60%', 'magenta'))

log('trace', 'gray', 'trace message', { visible: true })
log('debug', 'blue', 'debug message')
log('info', 'green', 'info message')
log('warn', 'yellow', 'warn message')
log('error', 'red', 'error message')
