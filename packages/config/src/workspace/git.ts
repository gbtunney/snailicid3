import path from 'node:path'
import { splitNonEmptyLines } from './../utilities/array.js'
import { runCommand } from './../utilities/command.js'
import { getWorkspacePackagesList, type WorkspacePackage } from './packages.js'

export type GitChangedFilesOptions = {
    base?: string
    head?: string
    includeStaged?: boolean
    includeUnstaged?: boolean
    includeUntracked?: boolean
}

/** Return workspace packages containing files selected by the requested Git changes. */
export function getChangedWorkspacePackagesFromGit(
    options: GitChangedFilesOptions = {},
): Array<WorkspacePackage> {
    const repoRoot = getRepoRoot()
    const packages = getWorkspacePackagesList()
    const changedFiles = getGitChangedFiles(options)

    const packageDirs = packages
        .map((pkg) => ({
            absDir: path.resolve(repoRoot, pkg.path),
            pkg,
        }))
        // Longer paths first so nested packages win if that ever happens.
        .toSorted(
            (leftPackage, rightPackage) =>
                rightPackage.absDir.length - leftPackage.absDir.length,
        )

    const hits = new Map<string, WorkspacePackage>()

    for (const repoRelativeFile of changedFiles) {
        const absFile = path.resolve(repoRoot, repoRelativeFile)

        for (const { absDir, pkg } of packageDirs) {
            if (isInsideDir(absFile, absDir)) {
                hits.set(pkg.name, pkg)
                break
            }
        }
    }

    return [...hits.values()]
}

/** List repository-relative files changed in the requested Git worktree areas or revision range. */
export function getGitChangedFiles(
    options: GitChangedFilesOptions = {},
): Array<string> {
    const {
        base,
        head,
        includeStaged = true,
        includeUnstaged = true,
        includeUntracked = true,
    } = options

    const files = new Set<string>()

    const add = (args: ReadonlyArray<string>): void => {
        const output = runCommand('git', args)

        if (!output.success) return

        for (const file of splitNonEmptyLines(output.stdout)) {
            files.add(file)
        }
    }

    if (base && head) {
        add(['diff', '--name-only', `${base}...${head}`])
    }

    if (includeStaged) {
        add(['diff', '--name-only', '--cached'])
    }

    if (includeUnstaged) {
        add(['diff', '--name-only'])
    }

    if (includeUntracked) {
        add(['ls-files', '--others', '--exclude-standard'])
    }

    return [...files]
}

/** Resolve the current Git root, optionally falling back to the process working directory. */
export function getRepoRoot(options: { fallbackToCwd?: boolean } = {}): string {
    const { fallbackToCwd = false } = options

    const output = runCommand('git', ['rev-parse', '--show-toplevel'])

    if (output.success && output.stdout.trim()) {
        return output.stdout.trim()
    }

    if (fallbackToCwd) {
        return process.cwd()
    }

    throw new Error(
        [
            'Unable to determine git repository root.',
            'Expected to be inside a Git repository.',
            output.stderr.trim(),
        ]
            .filter(Boolean)
            .join('\n'),
    )
}

/** Test whether a path is the supplied directory or one of its descendants. */
function isInsideDir(absChildPath: string, absParentDir: string): boolean {
    const relativePath = path.relative(absParentDir, absChildPath)

    return (
        relativePath === '' ||
        (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
    )
}
