import { readFileSync } from 'node:fs'

/**
 * Frozen release-plan documents recorded from real repository and registry history.
 *
 * These are literal JSON files rather than composer output. A fixture that calls `createReleasePlan()` can only ever
 * agree with the composer, which makes it a mirror instead of a characterization: it would drift silently the moment
 * the derivation rules changed. Reading checked-in documents lets the tests assert two independent things — that the
 * canonical schema still parses a document an external adapter may already hold, and that today's composer still
 * reproduces what was actually observed at those commits.
 *
 * Each document records what was true at that pull request's head commit: local versions read from the workspace
 * manifests, and exact `name@version` existence in the npm registry. Dist-tag pointers are recorded as `{}` because the
 * historical Actions detector never captured them per package — and a plan must never claim `latest` points at a
 * version it simultaneously reports as missing.
 *
 * `pull-request-232` is head `a7093c8`, where no changesets were pending and `storybook-config@0.1.0` and
 * `workspace@0.1.0` were the two exact versions absent from npm; merging that pull request published both.
 * `pull-request-233` is head `e78f39e`, where the `whole-banks-swim` changeset was pending yet every public exact
 * version existed in npm, so intent alone produced no candidates. `pull-request-234` is head `ddf77e3`, where that
 * changeset had been consumed and its versions applied, leaving nine public exact versions absent from npm and still
 * unauthorized.
 *
 * The workspace held twelve packages at all three commits: ten public and two private. #206 describes the public
 * inventory as nine because `@snailicid3/types@0.0.3` was already published and never moved across the three commits,
 * so it was never a candidate — the candidate counts in that narrative match these documents exactly.
 */
export const releasePlanFixtureNames = [
    'pull-request-232',
    'pull-request-233',
    'pull-request-234',
] as const

export type ReleasePlanFixtureName = (typeof releasePlanFixtureNames)[number]

/**
 * Read one frozen plan document as `unknown`.
 *
 * The return type is deliberately `unknown`: these documents stand in for machine input arriving from outside the
 * package, so a test must earn its types by parsing them with the canonical schema rather than by asserting them.
 */
export function readReleasePlanFixture(name: ReleasePlanFixtureName): unknown {
    return JSON.parse(
        readFileSync(
            new URL(`./release-plan/${name}.json`, import.meta.url),
            'utf8',
        ),
    )
}
