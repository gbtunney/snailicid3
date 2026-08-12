/** Split text into trimmed, non-empty lines while normalizing CRLF input. */
export function splitNonEmptyLines(text: string): Array<string> {
    return text
        .replaceAll('\r', '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
}

/** Remove empty and duplicate strings, then return the values in sorted order. */
export function uniqueSorted(values: ReadonlyArray<string>): Array<string> {
    return [...new Set(values.filter(Boolean))].toSorted()
}
