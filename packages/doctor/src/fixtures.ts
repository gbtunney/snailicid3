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
 *
 * Export evidence is addressed by the manifest field path that declared the target, matching what the collector now
 * emits. The rows were migrated to that form rather than being matched in both the old and new shapes: two accepted
 * formats would let a row keep matching evidence the collector can no longer produce, which is how a registry stops
 * describing the code it is supposed to pin.
 */
export const DOCTOR_FIXTURES: ReadonlyArray<DoctorFixture> = [
    {
        id: 'EXP-EXAMPLE-001',
        matches: [
            {
                diagnosticCode: 'EXPORT_TARGET_MISSING',
                expectedEvidence: [
                    'package.json#exports["."].import -> ./dist/index.js',
                    'package.json#exports["."].require -> ./dist/index.cjs',
                    'package.json#exports["./node"].import -> ./dist/node.mjs',
                    'package.json#exports["./node"].require -> ./dist/node.cjs',
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
