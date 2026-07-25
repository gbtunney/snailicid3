import path from 'node:path'

/** Convert an absolute or explicitly relative path to a clean repository-relative path. */
export function normalizeRepoPath(repoRoot: string, inputPath: string): string {
    const cleanPath = inputPath.replace(/^\.\//, '')

    if (path.isAbsolute(cleanPath)) {
        return path.relative(repoRoot, cleanPath)
    }

    return cleanPath
}
