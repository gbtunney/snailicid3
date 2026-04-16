export type FormatValueOptions = {
    depth?: number
    compact?: boolean | number
    maxArrayLength?: number
    sorted?: boolean | ((a: string, b: string) => number)
}

export const formatValue = (value: unknown, _opts?: FormatValueOptions): string => {
    switch (typeof value) {
        case 'string':
            return value
        case 'number':
        case 'boolean':
            return String(value)
        case 'bigint':
            return `${value.toString()}n`
        case 'symbol':
            return value.toString()
        case 'function':
            return value.name ? `[Function ${value.name}]` : '[Function]'
        case 'undefined':
            return 'undefined'
        case 'object':
            if (value === null) return 'null'
            if (value instanceof Error) return value.stack ?? `${value.name}: ${value.message}`
            try {
                return JSON.stringify(value, null, 2)
            } catch {
                return '[Uninspectable Object]'
            }
        default:
            return String(value)
    }
}

/** Join many unknowns into a single formatted string */
export const formatArgs = (delimiter = '', ...vals: Array<unknown>): string =>
    vals.map((v) => formatValue(v)).join(delimiter)

/** Tagged template: safely interpolate unknowns without triggering restrict-template-expressions
 * @example fmt`Value: ${myValue}` */
export const fmt = (strings: TemplateStringsArray, ...values: Array<unknown>): string =>
    strings.reduce((accumulated, chunk, index) => {
        const interpolated = index < values.length ? formatValue(values[index]) : ''
        return accumulated + chunk + interpolated
    }, '')
