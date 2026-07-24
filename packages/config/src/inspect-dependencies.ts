#!/usr/bin/env node

import path from 'node:path'
import micromatch from 'micromatch'
import { runCommand } from './utilities/command.js'
import { runCliIfEntrypoint } from './utilities/entrypoint.js'
import { getRepoRoot } from './workspace/git.js'
import {
    findNearestPackageJson,
    getWorkspacePackagesList,
    readPackageName,
    type WorkspacePackage,
} from './workspace/packages.js'
import { normalizeRepoPath } from './workspace/paths.js'

/** Run Knip once per workspace package, or once for the current child package. */
export function main(args: Array<string> = process.argv.slice(2)): void {
    const { forwardedArgs, ignoredPatterns } = parseArgs(args)
    const repoRoot = getRepoRoot({ fallbackToCwd: true })
    const packages = selectPackages(repoRoot, process.cwd()).filter(
        (pkg) => !isIgnored(pkg, repoRoot, ignoredPatterns),
    )

    if (packages.length === 0) {
        console.log('No workspace packages matched.')
        return
    }

    let failed = false

    for (const pkg of packages) {
        printHeader(pkg.name, repoRoot)
        const result = runCommand(
            'knip',
            ['--directory', path.resolve(repoRoot, pkg.path), ...forwardedArgs],
            { cwd: repoRoot, stdio: 'inherit' },
        )

        failed ||= !result.success
    }

    process.stdout.write('\n')
    if (failed) process.exitCode = 1
}

/** Separate inspector-only ignore flags from arguments forwarded to Knip. */
function parseArgs(args: ReadonlyArray<string>): {
    forwardedArgs: Array<string>
    ignoredPatterns: Array<string>
} {
    const forwardedArgs: Array<string> = []
    const ignoredPatterns: Array<string> = []

    for (let index = 0; index < args.length; index += 1) {
        const argument = args[index] ?? ''
        const inline = argument.match(/^--ignore(?:-package)?=(.+)$/u)

        if (inline) {
            ignoredPatterns.push(inline[1] ?? '')
            continue
        }

        if (argument === '--ignore' || argument === '--ignore-package') {
            const pattern = args[index + 1]
            if (!pattern) throw new Error(`${argument} requires a pattern`)
            ignoredPatterns.push(pattern)
            index += 1
            continue
        }

        forwardedArgs.push(argument)
    }

    return { forwardedArgs, ignoredPatterns }
}

/** Select every child workspace at the root, or only the nearest package below it. */
function selectPackages(
    repoRoot: string,
    cwd: string,
): Array<WorkspacePackage> {
    const nearestManifest = findNearestPackageJson(repoRoot, cwd)
    const rootManifest = path.join(repoRoot, 'package.json')

    if (nearestManifest && nearestManifest !== rootManifest) {
        return [
            {
                name: readPackageName(nearestManifest) ?? path.basename(cwd),
                path: path.dirname(nearestManifest),
                version: '',
            },
        ]
    }

    return getWorkspacePackagesList(
        (pkg) => path.resolve(pkg.path) !== repoRoot,
    ).toSorted((left, right) => left.path.localeCompare(right.path))
}

/** Match an ignore pattern against both the package name and repository-relative path. */
function isIgnored(
    pkg: WorkspacePackage,
    repoRoot: string,
    patterns: ReadonlyArray<string>,
): boolean {
    const relativePath = normalizeRepoPath(repoRoot, pkg.path)
    const directoryName = path.basename(relativePath)

    return patterns.some((pattern) =>
        [pkg.name, relativePath, directoryName].some((value) =>
            micromatch.isMatch(value, pattern, { dot: true }),
        ),
    )
}

/** Print a full-width snail-sh heading before a package report. */
function printHeader(packageName: string, repoRoot: string): void {
    const result = runCommand(
        'snail-sh',
        ['header', `🐌 ${packageName}`, '100%', 'magenta', '-'],
        { cwd: repoRoot, stdio: 'inherit' },
    )

    if (!result.success) {
        process.stdout.write(`\n🐌 ${packageName}\n\n`)
    }
}

runCliIfEntrypoint(import.meta, main, process.argv.slice(2))
