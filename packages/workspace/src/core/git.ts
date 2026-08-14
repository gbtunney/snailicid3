import { runCommand } from '@snailicid3/node-utils'
import path from 'node:path'
import { splitNonEmptyLines } from './array.js'
import { getWorkspacePackagesList, type WorkspacePackage } from './packages.js'

/** Which part of the worktree a changed file was observed in. */
export type GitChangeArea = 'range' | 'staged' | 'unstaged' | 'untracked'

/** A changed file plus every area it appears in. */
export type GitChangedFile = {
    areas: Array<GitChangeArea>
    file: string
}

export type GitChangedFilesOptions = {
    base?: string
    /** Directory the git commands run in. Defaults to the process working directory. */
    cwd?: string
    head?: string
    includeStaged?: boolean
    includeUnstaged?: boolean
    includeUntracked?: boolean
}

const AREA_ORDER: ReadonlyArray<GitChangeArea> = [
    'range',
    'staged',
    'unstaged',
    'untracked',
]

/** Return workspace packages containing files selected by the requested Git changes. */
export function getChangedWorkspacePackagesFromGit(
    options: GitChangedFilesOptions = {},
): Array<WorkspacePackage> {
    const repoRoot = getRepoRoot()
    const packages = getWorkspacePackagesList()
    const changedFiles = getGitChangedFiles({ cwd: repoRoot, ...options })

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

export function getCurrentBranch(repoRoot: string): string {
    const result = runCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: repoRoot,
    })

    if (!result.success) {
        throw new Error(result.stderr || 'Unable to determine current branch')
    }

    return result.stdout.trim()
}

/** List repository-relative files changed in the requested Git worktree areas or revision range. */
export function getGitChangedFiles(
    options: GitChangedFilesOptions = {},
): Array<string> {
    return getGitChangedFilesByArea(options).map(({ file }) => file)
}

/**
 * List repository-relative changed files together with the areas each was observed in.
 *
 * A file that is both staged and further modified in the worktree carries both areas. Collapsing that to a single list
 * loses the distinction a commit-time report most needs to show, because the unstaged half will not be committed.
 */
export function getGitChangedFilesByArea(
    options: GitChangedFilesOptions = {},
): Array<GitChangedFile> {
    const {
        base,
        cwd,
        head,
        includeStaged = true,
        includeUnstaged = true,
        includeUntracked = true,
    } = options

    const areas = new Map<string, Set<GitChangeArea>>()

    const add = (area: GitChangeArea, args: ReadonlyArray<string>): void => {
        const output = runCommand('git', args, cwd ? { cwd } : {})

        if (!output.success) {
            throw new Error(
                [
                    `git ${args.join(' ')} failed${cwd ? ` in ${cwd}` : ''}.`,
                    output.stderr.trim(),
                ]
                    .filter(Boolean)
                    .join('\n'),
            )
        }

        for (const file of splitNonEmptyLines(output.stdout)) {
            const existing = areas.get(file)

            if (existing) existing.add(area)
            else areas.set(file, new Set([area]))
        }
    }

    if (base && head) {
        add('range', ['diff', '--name-only', `${base}...${head}`])
    }

    if (includeStaged) {
        add('staged', ['diff', '--name-only', '--cached'])
    }

    if (includeUnstaged) {
        add('unstaged', ['diff', '--name-only'])
    }

    if (includeUntracked) {
        add('untracked', ['ls-files', '--others', '--exclude-standard'])
    }

    return [...areas.entries()].map(([file, fileAreas]) => ({
        areas: AREA_ORDER.filter((area) => fileAreas.has(area)),
        file,
    }))
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
