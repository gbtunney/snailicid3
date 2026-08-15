import type { DiagnosticCode, FixtureId } from './types.js'

export type DoctorFixture = Readonly<{
    id: FixtureId
    matches: ReadonlyArray<DoctorFixtureMatch>
    packageName: string
}>

export type DoctorFixtureMatch = Readonly<{
    diagnosticCode: DiagnosticCode
    expectedEvidence?: ReadonlyArray<string>
}>

/**
 * Executable registry of intentionally retained diagnostic fixtures.
 *
 * A row labels matching observed evidence; it never authorizes mutation or suppresses a finding. Some reserved
 * diagnostic codes do not have collectors yet and therefore cannot match until their read-only collector lands.
 */
export const DOCTOR_FIXTURES: ReadonlyArray<DoctorFixture> = [
    {
        id: 'EXP-EXAMPLE-001',
        matches: [
            {
                diagnosticCode: 'EXPORT_TARGET_MISSING',
                expectedEvidence: [
                    '. (import) -> ./dist/index.js',
                    '. (require) -> ./dist/index.cjs',
                    './node (import) -> ./dist/node.mjs',
                    './node (require) -> ./dist/node.cjs',
                ],
            },
            {
                diagnosticCode: 'EXPORT_TYPES_CONDITION_MISSING',
                expectedEvidence: [
                    'package.json#types -> ./dist/index.d.cts',
                    'package.json#exports["."] has no types condition',
                ],
            },
            {
                diagnosticCode: 'LEGACY_TARGET_MISSING',
                expectedEvidence: [
                    'package.json#main -> ./dist/index.cjs',
                    'package.json#module -> ./dist/index.js',
                    'package.json#types -> ./dist/index.d.cts',
                ],
            },
        ],
        packageName: '@snailicid3/example-package',
    },
    {
        id: 'API-LOGGER-001',
        matches: [{ diagnosticCode: 'API_SUPPORTING_EXPORT_MISSING' }],
        packageName: '@snailicid3/logger',
    },
    {
        id: 'PACK-LOGGER-001',
        matches: [{ diagnosticCode: 'PACK_DECLARATION_SURFACES_COMPETE' }],
        packageName: '@snailicid3/logger',
    },
    {
        id: 'RUNTIME-LOGGER-001',
        matches: [{ diagnosticCode: 'RUNTIME_INTENT_MISMATCH' }],
        packageName: '@snailicid3/logger',
    },
]

/** Return the registered fixture ID for a package diagnostic, if one exists. */
export function findFixtureId(
    packageName: string,
    diagnosticCode: DiagnosticCode,
    evidence: ReadonlyArray<string> = [],
): FixtureId | undefined {
    return DOCTOR_FIXTURES.find((fixture) => {
        if (fixture.packageName !== packageName) return false

        return fixture.matches.some(
            (match) =>
                match.diagnosticCode === diagnosticCode &&
                matchesExpectedEvidence(match, evidence),
        )
    })?.id
}

function matchesExpectedEvidence(
    match: DoctorFixtureMatch,
    evidence: ReadonlyArray<string>,
): boolean {
    if (match.expectedEvidence === undefined) return true

    return (
        evidence.length > 0 &&
        evidence.every((item) => match.expectedEvidence?.includes(item))
    )
}
