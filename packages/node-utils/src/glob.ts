import micromatch from 'micromatch'

/**
 * Filter a list of file paths by glob patterns.
 *
 * By default returns the files that match any of `globs`. With `negate: true` it returns the files that match none of
 * them (i.e. removes matches). Only simple globs such as `*.md` or `**\/*.api.md` are expected.
 */
export const filterFileArrByGlob = (
    files: ReadonlyArray<string>,
    globs: ReadonlyArray<string>,
    negate: boolean = false,
): Array<string> =>
    negate
        ? micromatch.not([...files], [...globs])
        : micromatch([...files], [...globs])
