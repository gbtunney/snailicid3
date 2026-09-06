import type { ResolutionKind } from '@arethetypeswrong/core'
import type { ManifestFacts } from './manifest-facts.js'

export const DIAGNOSTIC_CODES = [
    'MANIFEST_READ_ERROR',
    'MANIFEST_NAME_MISSING',
    'MANIFEST_FIELD_INVALID',
    'MANIFEST_METADATA_MISSING',
    'MANIFEST_PUBLICATION_FIELDS_CONFLICT',
    'EXPORT_TARGET_INVALID',
    'EXPORT_TARGET_MISSING',
    'EXPORT_TYPES_CONDITION_MISSING',
    'LEGACY_TARGET_MISSING',
    'BIN_TARGET_MISSING',
    'BIN_TARGET_NOT_EXECUTABLE',
    'API_SUPPORTING_EXPORT_MISSING',
    'PACK_DECLARATION_SURFACES_COMPETE',
    'RUNTIME_INTENT_MISMATCH',
    'WORKSPACE_DEPENDENCY_UNAVAILABLE',
    'WORKSPACE_DEPENDENCY_UNKNOWN',
    'PRIVATE_WORKSPACE_CODE_EMBEDDED',
    'PUBLINT_ERROR',
    'PUBLINT_WARNING',
    'PUBLINT_SUGGESTION',
    'PUBLINT_COLLECTOR_FAILED',
    'ATTW_RESOLUTION_PROBLEM',
    'ATTW_COLLECTOR_FAILED',
    'PACK_CANDIDATE_FAILED',
] as const

export type DiagnosticCode = (typeof DIAGNOSTIC_CODES)[number]

export type DiagnosticSeverity = 'error' | 'warning'

export type DoctorDiagnostic = Readonly<{
    code: DiagnosticCode
    evidence: ReadonlyArray<string>
    fixtureId?: FixtureId
    message: string
    packageName: string
    packageRoot: string
    severity: DiagnosticSeverity
}>

export const FIXTURE_IDS = [
    'EXP-EXAMPLE-001',
    'API-LOGGER-001',
    'PACK-LOGGER-001',
    'RUNTIME-LOGGER-001',
] as const

/**
 * Whether a collector produced an answer at all.
 *
 * A crashed validator, an unsupported package shape and a missing tool are not clean bills of health, so the outcome is
 * kept separate from the findings: an empty finding list under a `failed` outcome must never read as "valid".
 *
 * `not_applicable` is the third state, and it exists because "nothing to examine" and "examined and found nothing" are
 * the same empty finding list. Only the outcome can tell a reader that a collector never had a subject — a package
 * shipping no type declarations gives ATTW nothing to judge, and reporting that as `completed` would let an untyped
 * package read as a package whose types were checked and cleared.
 */
export type CollectorOutcome =
    | Readonly<{ detail: string; state: 'failed' }>
    | Readonly<{ reason: string; state: 'not_applicable' }>
    | Readonly<{ state: 'completed' }>

export type DoctorPackageReport = Readonly<{
    diagnostics: ReadonlyArray<DoctorDiagnostic>
    /**
     * Observable manifest state, absent only when the manifest could not be read as JSON at all.
     *
     * Present even when the manifest is incomplete or partly malformed, because a consumer usually still needs the
     * fields that did parse. What the state means for a release is not decided here — see {@link ManifestFacts}.
     */
    manifestFacts?: ManifestFacts
    manifestPath: string
    packageName: string
    packageRoot: string
    /**
     * What packing and validating this package's publication candidate found, when that ran.
     *
     * Absent rather than empty when the package was not selected for packed validation, so a reader can tell "not
     * validated" from "validated and clean" — the same distinction the collector outcomes draw one level down. The
     * findings themselves live in `diagnostics` with the rest, counted once; this field carries the evidence that would
     * otherwise be lost, which is what `--json` consumers need.
     */
    packedValidation?: PackedValidationEvidence
}>

export type DoctorReport = Readonly<{
    diagnostics: ReadonlyArray<DoctorDiagnostic>
    packages: ReadonlyArray<DoctorPackageReport>
    root: string
    summary: DoctorSummary
}>

export type DoctorSummary = Readonly<{
    findings: number
    knownFixtureFindings: number
    packages: number
    unregisteredFindings: number
}>

export type FixtureId = (typeof FIXTURE_IDS)[number]

/** The packed-validation facts worth keeping in the report once the candidate itself is disposed. */
export type PackedValidationEvidence = Readonly<{
    attw: CollectorOutcome
    /** Everything the candidate would publish, as consumers would see the paths. */
    files: ReadonlyArray<string>
    publint: CollectorOutcome
    /** The resolution modes ATTW judged against, so a finding's absence is readable as a statement about scope. */
    resolutions: ReadonlyArray<ResolutionKind>
}>
