const doctorConsumerEvidence = Symbol('doctorConsumerEvidence')

export type IsolatedConsumerCheck = Readonly<{
    detail?: string
    name: string
    state: 'failed' | 'passed' | 'skipped'
}>

export type IsolatedPackageConsumerResult = Readonly<{
    /** Names whose absence from the consumer tree was verified while a public surface still worked. */
    absenceProven: ReadonlyArray<string>
    absentPackages: ReadonlyArray<string>
    checks: ReadonlyArray<IsolatedConsumerCheck>
    [doctorConsumerEvidence]: true
    removedPackages: ReadonlyArray<string>
    state: 'failed' | 'passed'
}>

export function createIsolatedPackageConsumerResult(
    result: Omit<IsolatedPackageConsumerResult, typeof doctorConsumerEvidence>,
): IsolatedPackageConsumerResult {
    return Object.freeze({
        ...result,
        [doctorConsumerEvidence]: true as const,
    })
}

/**
 * Whether a real consumer run proved this package works while one dependency is missing.
 *
 * The brand keeps a hand-written object shaped like consumer evidence from becoming proof, and the per-name list keeps
 * one dependency's proven absence from waiving a different dependency.
 */
export function hasAbsenceProof(
    result: IsolatedPackageConsumerResult | undefined,
    dependency: string,
): boolean {
    return (
        result?.[doctorConsumerEvidence] === true &&
        result.state === 'passed' &&
        result.absenceProven.includes(dependency)
    )
}
