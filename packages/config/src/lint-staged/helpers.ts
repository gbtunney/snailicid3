export const extensionsToGlob = (extensions: ReadonlyArray<string>): string =>
    `*.{${extensions.join(',')}}`

export const quoteArg = (path: string): string =>
    `"${path.replaceAll('"', '\\"')}"`

export const toFileArgs = (
    staged: ReadonlyArray<string> | string,
): Array<string> => (Array.isArray(staged) ? staged : [staged]).map(quoteArg)
