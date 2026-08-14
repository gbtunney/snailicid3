import path from 'node:path'

/** Convert an absolute or explicitly relative path to a clean repository-relative path. */
export function normalizeRepoPath(repoRoot: string, inputPath: string): string {
    const normalized = safeNormalizeRepoPath(repoRoot, inputPath)

    if (normalized === null) {
        throw new Error(
            `Path escapes the repository root: ${inputPath} (root: ${repoRoot})`,
        )
    }

    return normalized
}

/**
 * Convert a path to a clean repository-relative POSIX path, or `null` if it escapes the repository.
 *
 * Classifier input must be consistent before it reaches micromatch, and containment must be decided by `path.relative`
 * rather than a string prefix — `startsWith('/repo')` also matches `/repo-other`. The repository root itself normalizes
 * to `'.'`, which is how the root package is identified.
 */
export function safeNormalizeRepoPath(
    repoRoot: string,
    inputPath: string,
): null | string {
    const root = path.resolve(repoRoot)
    const absolute = path.resolve(root, inputPath)
    const relative = path.relative(root, absolute)

    if (relative.startsWith('..') || path.isAbsolute(relative)) return null

    return relative === '' ? '.' : relative.split(path.sep).join('/')
}
