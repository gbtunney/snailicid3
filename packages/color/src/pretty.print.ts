/** Tagged template — simple string interpolation for error messages. */
export const fmt = (strings: TemplateStringsArray, ...values: unknown[]): string =>
    strings.raw.reduce(
        (acc, str, i) => acc + str + (i < values.length ? String(values[i]) : ''),
        '',
    )
