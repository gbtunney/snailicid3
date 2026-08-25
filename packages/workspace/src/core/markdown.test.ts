import { describe, expect, it } from 'vitest'
import {
    escapeMarkdownCell,
    renderMarkdownDocument,
    renderMarkdownList,
    renderMarkdownSection,
    renderMarkdownTable,
} from './markdown.js'

const columns = [
    { key: 'left', label: 'Left' },
    { key: 'right', label: 'Right' },
]

describe('markdown helpers', () => {
    describe('cell escaping', () => {
        it('escapes a pipe so it cannot start a new cell', () => {
            expect(escapeMarkdownCell('a|b')).toBe('a\\|b')
        })

        it('escapes backslashes before pipes rather than re-escaping its own output', () => {
            expect(escapeMarkdownCell('a\\b')).toBe('a\\\\b')
            expect(escapeMarkdownCell('a\\|b')).toBe('a\\\\\\|b')
        })

        it('replaces newlines so a cell cannot end its row', () => {
            expect(escapeMarkdownCell('a\nb')).toBe('a<br>b')
        })
    })

    describe('tables', () => {
        it('renders a header, a separator and one line per row', () => {
            expect(renderMarkdownTable(columns, [['1', '2']])).toBe(
                ['| Left | Right |', '| --- | --- |', '| 1 | 2 |'].join('\n'),
            )
        })

        it('keeps the header when there are no rows', () => {
            expect(renderMarkdownTable(columns, [])).toBe(
                ['| Left | Right |', '| --- | --- |'].join('\n'),
            )
        })

        it('pads a short row instead of shifting later cells left', () => {
            expect(renderMarkdownTable(columns, [['1']])).toContain('| 1 |  |')
        })

        it('escapes cell content', () => {
            expect(renderMarkdownTable(columns, [['a|b', 'c']])).toContain(
                '| a\\|b | c |',
            )
        })

        it('renders nothing without columns', () => {
            expect(renderMarkdownTable([], [['1']])).toBe('')
        })
    })

    describe('sections and documents', () => {
        it('renders a heading at the requested level', () => {
            expect(
                renderMarkdownSection({
                    body: ['text'],
                    heading: 'Title',
                    level: 3,
                }),
            ).toBe('### Title\n\ntext')
        })

        it('clamps a heading level into the legal range', () => {
            expect(
                renderMarkdownSection({ body: [], heading: 'T', level: 99 }),
            ).toBe('###### T')
            expect(
                renderMarkdownSection({ body: [], heading: 'T', level: 0 }),
            ).toBe('# T')
        })

        it('drops empty blocks rather than emitting blank runs', () => {
            expect(
                renderMarkdownSection({
                    body: ['', '  ', 'kept'],
                    heading: 'T',
                }),
            ).toBe('## T\n\nkept')
        })

        it('renders a bullet list and nothing at all when empty', () => {
            expect(renderMarkdownList(['a', 'b'])).toBe('- a\n- b')
            expect(renderMarkdownList([])).toBe('')
        })

        it('separates document blocks by exactly one blank line', () => {
            expect(renderMarkdownDocument(['a', '', 'b'])).toBe('a\n\nb\n')
        })
    })
})
