/**
 * Generic Markdown building blocks.
 *
 * Nothing here knows about releases. Hand-assembling pipe tables at each call site is how renderers drift apart — one
 * forgets to escape a cell, another emits a different separator — so the mechanics live in one place and callers supply
 * only content.
 */

export type MarkdownSection = {
    body: ReadonlyArray<string>
    heading: string
    level?: number
}

export type MarkdownTableColumn = {
    key: string
    label: string
}

/**
 * Escape a value so it cannot break out of a table cell.
 *
 * Backslashes go first, otherwise escaping a pipe would produce a backslash this pass then re-escape it. Newlines
 * become `<br>` because a literal newline ends the row.
 */
export function escapeMarkdownCell(value: string): string {
    return value
        .replaceAll('\\', '\\\\')
        .replaceAll('|', '\\|')
        .replaceAll('\n', '<br>')
}

/** Join rendered blocks into one document with exactly one blank line between them. */
export function renderMarkdownDocument(blocks: ReadonlyArray<string>): string {
    return `${blocks.filter((block) => block.trim() !== '').join('\n\n')}\n`
}

/** Render a bullet list, omitting the list entirely when there is nothing to say. */
export function renderMarkdownList(items: ReadonlyArray<string>): string {
    return items.map((item) => `- ${item}`).join('\n')
}

/**
 * Render a heading followed by its blocks.
 *
 * Empty blocks are dropped so a section with no table and no facts does not emit a run of blank lines.
 */
export function renderMarkdownSection(section: MarkdownSection): string {
    const level = Math.min(6, Math.max(1, section.level ?? 2))
    const blocks = section.body.filter((block) => block.trim() !== '')

    return [`${'#'.repeat(level)} ${section.heading}`, ...blocks].join('\n\n')
}

/**
 * Render a GitHub-flavoured table.
 *
 * A row shorter than the column list is padded rather than rejected, so a caller cannot silently shift every following
 * cell one column left. The header and separator are emitted even with no rows, because an empty table still documents
 * what was looked at.
 */
export function renderMarkdownTable(
    columns: ReadonlyArray<MarkdownTableColumn>,
    rows: ReadonlyArray<ReadonlyArray<string>>,
): string {
    if (columns.length === 0) return ''

    const header = `| ${columns.map((column) => escapeMarkdownCell(column.label)).join(' | ')} |`
    const separator = `| ${columns.map(() => '---').join(' | ')} |`
    const body = rows.map(
        (row) =>
            `| ${columns
                .map((_column, index) => escapeMarkdownCell(row[index] ?? ''))
                .join(' | ')} |`,
    )

    return [header, separator, ...body].join('\n')
}
