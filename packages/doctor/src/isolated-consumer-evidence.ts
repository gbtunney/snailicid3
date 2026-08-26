const doctorConsumerEvidence = Symbol('doctorConsumerEvidence')

export type IsolatedConsumerCheck = Readonly<{
    detail?: string
    name: string
    state: 'failed' | 'passed' | 'skipped'
}>

export type IsolatedPackageConsumerResult = Readonly<{
    absentPackages: ReadonlyArray<string>
    checks: ReadonlyArray<IsolatedConsumerCheck>
    [doctorConsumerEvidence]: true
    optionalAbsenceProven: boolean
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

export function hasOptionalAbsenceProof(
    result: IsolatedPackageConsumerResult | undefined,
    dependency: string,
): boolean {
    return (
        result?.[doctorConsumerEvidence] === true &&
        result.state === 'passed' &&
        result.optionalAbsenceProven &&
        result.absentPackages.includes(dependency)
    )
}
