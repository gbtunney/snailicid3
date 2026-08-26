export const DIAGNOSTIC_CODES = [
    'MANIFEST_READ_ERROR',
    'MANIFEST_NAME_MISSING',
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

export type DoctorPackageReport = Readonly<{
    diagnostics: ReadonlyArray<DoctorDiagnostic>
    manifestPath: string
    packageName: string
    packageRoot: string
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
