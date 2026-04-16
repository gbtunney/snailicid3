import { inspect } from 'node:util'

/** Tagged template — simple string interpolation for error/log messages. */
export const fmt = (strings: TemplateStringsArray, ...values: unknown[]): string =>
    strings.raw.reduce(
        (acc, str, i) => acc + str + (i < values.length ? String(values[i]) : ''),
        '',
    )

/** Format a single value for display. */
export const formatValue = (value: unknown): string =>
    typeof value === 'string' ? value : inspect(value, { depth: 4, colors: true })

/** Format multiple log args into a single output string. */
export const formatArgs = (prefix: string, ...args: unknown[]): string =>
    [prefix, ...args.map(formatValue)].filter(Boolean).join(' ')

/** Return a pretty-printed string of a value. */
export const prettify = (value: unknown, depth = 4): string =>
    inspect(value, { depth, colors: true })

/** Print a pretty-formatted value to stdout. */
export const prettyPrint = (value: unknown, depth = 4): void =>
    console.log(prettify(value, depth))
