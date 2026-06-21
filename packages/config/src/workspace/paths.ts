import path from 'node:path'

export function normalizeRepoPath(repoRoot: string, inputPath: string): string {
    const cleanPath = inputPath.replace(/^\.\//, '')

    if (path.isAbsolute(cleanPath)) {
        return path.relative(repoRoot, cleanPath)
    }

    return cleanPath
}
