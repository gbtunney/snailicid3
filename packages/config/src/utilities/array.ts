export function splitNonEmptyLines(text: string): Array<string> {
    return text
        .replaceAll('\r', '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
}

export function uniqueSorted(values: ReadonlyArray<string>): Array<string> {
    return [...new Set(values.filter(Boolean))].toSorted()
}
