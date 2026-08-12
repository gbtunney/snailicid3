import { inspect } from 'node:util'

/** Format a single value for display. */
export const formatValue = (value: unknown): string =>
    typeof value === 'string'
        ? value
        : inspect(value, { colors: true, depth: 4 })

/** Format multiple log args into a single output string. */
export const formatArgs = (prefix: string, ...args: Array<unknown>): string =>
    [prefix, ...args.map(formatValue)].filter(Boolean).join(' ')

/** Safely interpolate unknown values into a tagged template. */
export const fmt = (
    strings: TemplateStringsArray,
    ...values: Array<unknown>
): string =>
    strings.reduce(
        (output, chunk, index) =>
            output +
            chunk +
            (index < values.length
                ? typeof values[index] === 'string'
                    ? values[index]
                    : inspect(values[index], { colors: false, depth: 4 })
                : ''),
        '',
    )

/** Return a pretty-printed string of a value. */
export const prettify = (value: unknown, depth = 4): string =>
    inspect(value, { colors: true, depth })
