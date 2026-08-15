#!/usr/bin/env node

import { parseArgv, runCliIfEntrypoint } from '@snailicid3/node-utils'
import { z } from 'zod'

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
    type WidthSpec,
} from './../terminal.js'

const rawInvocationSchema = z.array(z.string()).min(1, {
    message: 'Usage: snail-sh <command> [...args]',
})

const optionalString = z.string().optional()
const optionalBoolean = z.stringbool().optional()
const optionalInteger = z.coerce.number().int().optional()

const HELP = `Usage:
  snail-sh <command> [...args]

Commands:
  log, info, success, warn, error, critical
  header, subheader, section, kabob, rule, line, spacer
  kv-pair, status-pair, step, style-text, gray-ramp`

const ruleArgumentsSchema = z.tuple([
    optionalString,
    optionalString,
    optionalInteger,
    optionalBoolean,
])
const kabobArgumentsSchema = z.tuple([
    z.string(),
    optionalString,
    optionalString,
    optionalBoolean,
    optionalString,
    optionalInteger,
    optionalBoolean,
    optionalString,
])
const pairArgumentsSchema = z.tuple([
    z.string(),
    z.string(),
    optionalString,
    optionalString,
    optionalString,
])

const write = (value: string): void => {
    process.stdout.write(value)
}

const writeLine = (value: string): void => {
    console.log(value)
}

const parseWidth = (value: string | undefined): undefined | WidthSpec =>
    value as undefined | WidthSpec

const normalizeCommand = (value: string): string =>
    value.trim().toLowerCase().replaceAll('-', '_')

export function main(argv: Array<string> = process.argv.slice(2)): void {
    if (
        argv.length === 1 &&
        (argv[0] === '--help' || argv[0] === '-h' || argv[0] === 'help')
    ) {
        console.log(HELP)
        return
    }

    const positionalArgv =
        argv.length === 0 ? argv : [argv[0] ?? '', '--', ...argv.slice(1)]
    const parsed = parseArgv(z.object({}), positionalArgv, rawInvocationSchema)
    const [rawCommand, ...rawArguments] = parsed.positionals
    const command = normalizeCommand(rawCommand)

    switch (command) {
        case 'created': {
            const [message = ''] = z.tuple([optionalString]).parse(rawArguments)
            writeLine(`${styleText('  OK created:', 'green')} ${message}`)
            return
        }
        case 'critical': {
            const [message = ''] = z.tuple([optionalString]).parse(rawArguments)
            console.error(`\n${styleText(`[critical] ${message}`, 'bg-red')}`)
            return
        }
        case 'die': {
            const [message = ''] = z.tuple([optionalString]).parse(rawArguments)
            console.error(`\n${styleText(`[critical] ${message}`, 'bg-red')}`)
            throw new Error(message)
        }
        case 'err':
        case 'error': {
            const [message = ''] = z.tuple([optionalString]).parse(rawArguments)
            console.error(styleText(`[error] ${message}`, 'red'))
            return
        }
        case 'gray_ramp':
        case 'grey_ramp': {
            const [marker = ' ', segmentWidth = 5] = z
                .tuple([optionalString, optionalInteger])
                .parse(rawArguments)
            writeLine(grayRamp(marker, segmentWidth))
            return
        }
        case 'header': {
            const [message, width, color, marker] = z
                .tuple([
                    z.string(),
                    optionalString,
                    optionalString,
                    optionalString,
                ])
                .parse(rawArguments)
            write(
                header(message, {
                    marker: marker ?? '=',
                    style: color ?? 'cyan',
                    width: parseWidth(width) ?? 3,
                }),
            )
            return
        }
        case 'info': {
            const [message = ''] = z.tuple([optionalString]).parse(rawArguments)
            writeLine(styleText(`[info] i ${message}`, 'gray'))
            return
        }
        case 'kabob':
        case 'kebab': {
            const [
                text,
                width,
                color,
                invert,
                marker,
                padding,
                newline,
                textStyle,
            ] = kabobArgumentsSchema.parse(rawArguments)
            write(
                kabob(text, {
                    invert: invert ?? false,
                    marker: marker ?? '-',
                    newline: newline ?? true,
                    padding: padding ?? 1,
                    style: color ?? 'cyan',
                    textStyle: textStyle,
                    width: parseWidth(width) ?? 'auto',
                }),
            )
            return
        }
        case 'kv_pair': {
            const [key, value, delimiter, valueStyle, keyStyle] =
                pairArgumentsSchema.parse(rawArguments)
            writeLine(
                kvPair(key, value, {
                    delimiter: delimiter ?? ' ',
                    keyStyle: keyStyle ?? 'bold-mid-grey',
                    valueStyle: valueStyle ?? 'grey',
                }),
            )
            return
        }
        case 'line': {
            const [marker, width, color] = z
                .tuple([optionalString, optionalString, optionalString])
                .parse(rawArguments)
            writeLine(
                line(marker ?? '-', {
                    style: color ?? 'cyan',
                    width: parseWidth(width) ?? 'auto',
                }),
            )
            return
        }
        case 'log': {
            const [message = '', color = 'reset', target] = z
                .tuple([optionalString, optionalString, optionalString])
                .parse(rawArguments)
            const output = styleText(message, color)
            if (target === 'stderr') console.error(output)
            else writeLine(output)
            return
        }
        case 'rule': {
            const [marker, width, height, newline] =
                ruleArgumentsSchema.parse(rawArguments)
            write(
                rule({
                    height: height ?? 1,
                    marker: marker ?? '=',
                    newline: newline ?? true,
                    width: parseWidth(width) ?? 'auto',
                }),
            )
            return
        }
        case 'section': {
            const [
                title,
                width,
                color,
                invert,
                marker,
                padding,
                newline,
                textStyle,
            ] = kabobArgumentsSchema.parse(rawArguments)
            write(
                section(title, {
                    invert: invert ?? false,
                    marker: marker ?? '=',
                    newline: newline ?? true,
                    padding: padding ?? 1,
                    style: color ?? 'cyan',
                    textStyle,
                    width: parseWidth(width) ?? 'auto',
                }),
            )
            return
        }
        case 'skipped': {
            const [message = ''] = z.tuple([optionalString]).parse(rawArguments)
            writeLine(`${styleText('  - skipped:', 'gray')} ${message}`)
            return
        }
        case 'spacer': {
            const [height = 1] = z.tuple([optionalInteger]).parse(rawArguments)
            write(spacer(height))
            return
        }
        case 'status_pair': {
            const [key, value, level, delimiter, keyStyle] =
                pairArgumentsSchema.parse(rawArguments)
            writeLine(
                statusPair(key, value, {
                    delimiter: delimiter ?? ' ',
                    keyStyle,
                    level,
                }),
            )
            return
        }
        case 'step': {
            const [message, style] = z
                .tuple([z.string(), optionalString])
                .parse(rawArguments)
            writeLine(step(message, style))
            return
        }
        case 'subheader': {
            const [message, style] = z
                .tuple([z.string(), optionalString])
                .parse(rawArguments)
            writeLine(subheader(message, style))
            return
        }
        case 'success': {
            const [message = ''] = z.tuple([optionalString]).parse(rawArguments)
            writeLine(styleText(`[success] ✓ ${message}`, 'green'))
            return
        }
        case 'warn':
        case 'warning': {
            const [message = ''] = z.tuple([optionalString]).parse(rawArguments)
            writeLine(`\n${styleText(`[warn] ${message}`, 'yellow')}`)
            return
        }
        default:
            throw new Error(`Unknown command: ${rawCommand}`)
    }
}

runCliIfEntrypoint(import.meta, main, process.argv.slice(2))
