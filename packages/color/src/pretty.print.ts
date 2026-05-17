/** Tagged template — simple string interpolation for error messages. */
export const fmt = (
    strings: TemplateStringsArray,
    ...values: Array<unknown>
): string =>
    strings.raw.reduce(
        (acc, str, index) =>
            acc + str + (index < values.length ? String(values[index]) : ''),
        '',
    )

export default fmt
