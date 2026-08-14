import micromatch from 'micromatch'

export type StringClassifiers = Readonly<Record<string, ReadonlyArray<string>>>

export type StringClassification = Readonly<Record<string, Array<string>>>

/** Classify strings into named glob buckets while preserving the matching values for each bucket. */
export const classifyStrings = (
    values: ReadonlyArray<string>,
    classifiers: StringClassifiers,
): StringClassification =>
    Object.fromEntries(
        Object.entries(classifiers).map(([name, patterns]) => [
            name,
            micromatch([...values], [...patterns], { dot: true }),
        ]),
    )

/** Classify file paths into named glob buckets. */
export const classifyFiles = classifyStrings
