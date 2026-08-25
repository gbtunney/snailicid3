import { describe, expect, it } from 'vitest'
import {
    readReleasePlanFixture,
    type ReleasePlanFixtureName,
    releasePlanFixtureNames,
} from './../../test-fixtures/release-plan.js'
import {
    createReleasePlan,
    type ReleasePackagePlanInput,
    type ReleasePlan,
    releasePlanSchema,
} from './release-plan.js'
import { createReleasePlanPresentation } from './release-presentation.js'
import {
    renderReleasePlanMarkdown,
    renderReleasePlanTerminal,
} from './release-render.js'

const fixturePlan = (name: ReleasePlanFixtureName): ReleasePlan =>
    releasePlanSchema.parse(readReleasePlanFixture(name))

const packageInput = (
    overrides: Partial<ReleasePackagePlanInput> = {},
): ReleasePackagePlanInput => ({
    doctor: { artifact: 'valid', dependencyClosure: 'valid' },
    gitTag: { selected: false },
    intent: { source: 'none' },
    name: '@snailicid3/workspace',
    policy: { decision: 'held', reason: 'No publish operation selected' },
    private: false,
    registry: {
        distTags: {},
        registryUrl: 'https://registry.npmjs.org/',
        state: 'missing',
    },
    version: '0.1.0',
    versionState: { state: 'current' },
    ...overrides,
})

const planOf = (...packages: Array<ReleasePackagePlanInput>): ReleasePlan =>
    createReleasePlan({ packages })

/** Every cell, column label and fact the presentation carries, flattened for parity assertions. */
const presentationValues = (plan: ReleasePlan): Array<string> => {
    const presentation = createReleasePlanPresentation(plan)

    return presentation.sections.flatMap((section) => [
        section.heading,
        ...section.facts.flatMap((fact) => [fact.label, fact.value]),
        ...(section.table?.columns.map((column) => column.label) ?? []),
        ...(section.table?.rows.flat() ?? []),
    ])
}

/** Strip terminal styling so a coloured table border cannot hide a missing cell. */
const ANSI_PATTERN = new RegExp(`${String.fromCodePoint(27)}\\[\\d+m`, 'gu')

const stripAnsi = (value: string): string => value.replaceAll(ANSI_PATTERN, '')

/** The order in which the given values first appear in a rendered document. */
const orderOfAppearance = (
    document: string,
    needles: ReadonlyArray<string>,
): Array<string> =>
    [...needles]
        .map((needle) => ({ index: document.indexOf(needle), needle }))
        .filter((entry) => entry.index !== -1)
        .toSorted((left, right) => left.index - right.index)
        .map((entry) => entry.needle)

describe('release plan renderers', () => {
    describe('parity with the shared presentation', () => {
        it.each(releasePlanFixtureNames)(
            'renders every %s presentation value in both projections',
            (name) => {
                const plan = fixturePlan(name)
                const markdown = renderReleasePlanMarkdown(plan)
                const terminal = stripAnsi(renderReleasePlanTerminal(plan))

                for (const value of presentationValues(plan)) {
                    expect(terminal).toContain(value)
                    expect(markdown).toContain(value)
                }
            },
        )

        it.each(releasePlanFixtureNames)(
            'gives %s the same rows in the same order in both projections',
            (name) => {
                const plan = fixturePlan(name)
                const markdown = renderReleasePlanMarkdown(plan)
                const terminal = stripAnsi(renderReleasePlanTerminal(plan))
                const names = plan.packages.map(
                    (packagePlan) => packagePlan.name,
                )

                expect(orderOfAppearance(markdown, names)).toEqual(names)
                expect(orderOfAppearance(terminal, names)).toEqual(names)
            },
        )

        it('moves both projections together when a package changes', () => {
            const before = planOf(packageInput())
            const after = planOf(
                packageInput({
                    registry: {
                        distTags: { latest: '0.1.0' },
                        registryUrl: 'https://registry.npmjs.org/',
                        state: 'exists',
                    },
                }),
            )

            expect(renderReleasePlanTerminal(before)).not.toEqual(
                renderReleasePlanTerminal(after),
            )
            expect(renderReleasePlanMarkdown(before)).not.toEqual(
                renderReleasePlanMarkdown(after),
            )
            expect(stripAnsi(renderReleasePlanTerminal(after))).toContain(
                'exists',
            )
            expect(renderReleasePlanMarkdown(after)).toContain('exists')
        })
    })

    describe('counts come from the plan, never from the renderer', () => {
        it.each(releasePlanFixtureNames)(
            'reports the %s summary the plan already computed',
            (name) => {
                const plan = fixturePlan(name)
                const markdown = renderReleasePlanMarkdown(plan)

                expect(markdown).toContain(
                    `**Published:** ${String(plan.summary.published)}`,
                )
                expect(markdown).toContain(
                    `**Pending held:** ${String(plan.summary.held)}`,
                )
                expect(markdown).toContain(
                    `**Private:** ${String(plan.summary.private)}`,
                )
                expect(markdown).toContain(
                    `**Packages:** ${String(plan.summary.packages)}`,
                )
            },
        )

        it('repeats a summary that disagrees with the rows rather than correcting it', () => {
            const plan = fixturePlan('pull-request-234')
            const tampered: ReleasePlan = {
                ...plan,
                summary: { ...plan.summary, published: 999 },
            }

            expect(renderReleasePlanMarkdown(tampered)).toContain(
                '**Published:** 999',
            )
            expect(stripAnsi(renderReleasePlanTerminal(tampered))).toContain(
                '999',
            )
        })
    })

    describe('rendering the distinctions the model keeps apart', () => {
        it('separates exact version existence from dist-tags', () => {
            const markdown = renderReleasePlanMarkdown(
                planOf(
                    packageInput({
                        registry: {
                            distTags: { latest: '0.1.0', next: '0.2.0' },
                            registryUrl: 'https://registry.npmjs.org/',
                            state: 'missing',
                        },
                    }),
                ),
            )

            expect(markdown).toContain('| missing |')
            expect(markdown).toContain('latest=0.1.0 next=0.2.0')
        })

        it('distinguishes pending held from pending eligible', () => {
            const held = renderReleasePlanMarkdown(planOf(packageInput()))
            const eligible = renderReleasePlanMarkdown(
                planOf(
                    packageInput({
                        policy: {
                            channel: 'next',
                            decision: 'selected',
                            reason: 'Explicit release operation',
                        },
                    }),
                ),
            )

            expect(held).toContain('pending_held')
            expect(held).toContain('held — No publish operation selected')
            expect(eligible).toContain('pending_eligible')
            expect(eligible).toContain('selected — Explicit release operation')
            expect(eligible).toContain('| next |')
        })

        it('shows a private package keeping version and tag intent', () => {
            const markdown = renderReleasePlanMarkdown(
                planOf(
                    packageInput({
                        gitTag: {
                            name: '@snailicid3/workspace@0.2.0',
                            selected: true,
                        },
                        intent: {
                            bump: 'minor',
                            reason: 'Authored changeset',
                            source: 'changesets',
                        },
                        private: true,
                        versionState: {
                            intendedVersion: '0.2.0',
                            state: 'pending',
                        },
                    }),
                ),
            )

            expect(markdown).toContain('private_unpublishable')
            expect(markdown).toContain('pending → 0.2.0')
            expect(markdown).toContain('changesets minor — Authored changeset')
            expect(markdown).toContain('@snailicid3/workspace@0.2.0')
            expect(markdown).toContain('observe, prepare, tag')
        })

        it.each([
            'unknown_auth',
            'unknown_network',
            'unknown_registry',
        ] as const)('keeps %s distinct rather than collapsing it', (state) => {
            const markdown = renderReleasePlanMarkdown(
                planOf(
                    packageInput({
                        registry: {
                            distTags: {},
                            registryUrl: 'https://registry.npmjs.org/',
                            state,
                        },
                    }),
                ),
            )

            expect(markdown).toContain(`| ${state} |`)
            expect(markdown).not.toContain('| missing |')
        })

        it('names an unresolved registry rather than inventing one', () => {
            const markdown = renderReleasePlanMarkdown(
                planOf(
                    packageInput({
                        registry: {
                            distTags: {},
                            registryUrl: null,
                            state: 'unknown_registry',
                        },
                    }),
                ),
            )

            expect(markdown).toContain('| unresolved |')
            expect(markdown).not.toContain('registry.npmjs.org')
        })

        it('renders Doctor validity and closure as separate facts', () => {
            const markdown = renderReleasePlanMarkdown(
                planOf(
                    packageInput({
                        doctor: {
                            artifact: 'valid',
                            dependencyClosure: 'blocked',
                        },
                        policy: {
                            channel: 'latest',
                            decision: 'selected',
                            reason: 'Explicit release operation',
                        },
                    }),
                ),
            )

            expect(markdown).toContain('| valid / blocked |')
            expect(markdown).toContain('blocked_dependency_closure')
        })

        it('records the observing execution', () => {
            const markdown = renderReleasePlanMarkdown(planOf(packageInput()))

            expect(markdown).toContain('**Operation:** observe')
            expect(markdown).toContain('**Schema version:** 1')
        })
    })

    describe('degenerate plans', () => {
        it('renders an empty plan without pretending packages were observed', () => {
            const plan = createReleasePlan({ packages: [] })
            const markdown = renderReleasePlanMarkdown(plan)

            expect(markdown).toContain('**Packages:** 0')
            expect(markdown).toContain('No workspace packages observed.')
            expect(markdown).toContain('| Package | Version |')
            expect(() => renderReleasePlanTerminal(plan)).not.toThrow()
        })

        it('escapes a value that would otherwise break the table', () => {
            const markdown = renderReleasePlanMarkdown(
                planOf(
                    packageInput({
                        policy: {
                            decision: 'held',
                            reason: 'Held | pending review',
                        },
                    }),
                ),
            )

            expect(markdown).toContain('held — Held \\| pending review')
        })
    })
})
