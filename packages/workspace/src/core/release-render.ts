import { table } from '@snailicid3/logger'
import {
    renderMarkdownDocument,
    renderMarkdownList,
    renderMarkdownSection,
    renderMarkdownTable,
} from './markdown.js'
import { type ReleasePlan } from './release-plan.js'
import {
    createReleasePlanPresentation,
    type ReleasePlanPresentation,
    type ReleasePresentationFact,
    type ReleasePresentationSection,
} from './release-presentation.js'

/**
 * Terminal and Markdown projections of one parsed release plan.
 *
 * Both renderers take the same presentation and differ only in how they draw it. Neither reads `ReleasePlan` directly:
 * the plan is turned into presentation once, at the top of each entry point, and everything below works from that. It
 * is what makes the parity tests meaningful rather than a coincidence that happens to hold today.
 */

/** Render the canonical plan as Markdown, suitable for a pull-request comment or a job summary. */
export function renderReleasePlanMarkdown(plan: ReleasePlan): string {
    return renderMarkdownPresentation(createReleasePlanPresentation(plan))
}

/** Render the canonical plan for a terminal, using the shared table infrastructure. */
export function renderReleasePlanTerminal(plan: ReleasePlan): string {
    return renderTerminalPresentation(createReleasePlanPresentation(plan))
}

function renderMarkdownPresentation(
    presentation: ReleasePlanPresentation,
): string {
    return renderMarkdownDocument([
        `# ${presentation.title}`,
        ...presentation.sections.map((section) =>
            renderMarkdownSection({
                body: [
                    renderMarkdownList(
                        section.facts.map(
                            (fact) => `**${fact.label}:** ${fact.value}`,
                        ),
                    ),
                    section.table === null
                        ? ''
                        : renderMarkdownTable(
                              section.table.columns,
                              section.table.rows,
                          ),
                    renderMarkdownList([...section.notes]),
                ],
                heading: section.heading,
                level: 2,
            }),
        ),
    ])
}

/** Facts render as a borderless two-column table so labels and values align without inventing a second table style. */
function renderTerminalFacts(
    facts: ReadonlyArray<ReleasePresentationFact>,
): string {
    if (facts.length === 0) return ''

    return table(
        facts.map((fact) => [`${fact.label}:`, fact.value]),
        { border: false, padding: 1, preset: 'plain' },
    )
}

function renderTerminalPresentation(
    presentation: ReleasePlanPresentation,
): string {
    return [
        presentation.title,
        ...presentation.sections.map(renderTerminalSection),
    ]
        .filter((block) => block.trim() !== '')
        .join('\n\n')
}

function renderTerminalSection(section: ReleasePresentationSection): string {
    const blocks = [
        section.heading,
        renderTerminalFacts(section.facts),
        section.table === null
            ? ''
            : table([...section.table.rows.map((row) => [...row])], {
                  head: section.table.columns.map((column) => column.label),
              }),
        section.notes.map((note) => `- ${note}`).join('\n'),
    ]

    return blocks.filter((block) => block.trim() !== '').join('\n')
}
