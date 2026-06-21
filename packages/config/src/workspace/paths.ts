import path from 'node:path'

/** Todo : this should use a normalize function in utilities ? */
export function normalizeRepoPath(repoRoot: string, inputPath: string): string {
    const cleanPath = inputPath.replace(/^\.\//, '')

    if (path.isAbsolute(cleanPath)) {
        return path.relative(repoRoot, cleanPath)
    }

    return cleanPath
}
