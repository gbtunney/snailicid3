#!/usr/bin/env node

import micromatch from 'micromatch'
import path from 'node:path'
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

/** TODO: figure out how to add the filters via arg w the default like the last one */

/** Run Knip once per workspace package, or once for the current child package. */
/** TODO: figure out how knip can run if not installed in root repo or consumer package */
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

/** Print a full-width snail-sh heading before a package report. */
function printHeader(packageName: string, repoRoot: string): void {
    /* Rule " " 50% 1  #todo this is temporary dont know why spacer wouldnt work 
kabob "🐌 ESBUILD CATALINA PATCH" "100%" "cyan"
rule " " 50% 1 
*/
    runCommand('snail-sh', ['rule', ' ', '50%', '1'], {
        cwd: repoRoot,
        stdio: 'inherit',
    })

    const result = runCommand(
        'snail-sh',
        ['kabob', `🐌 ${packageName}`, '100%', 'magenta', '*'],
        { cwd: repoRoot, stdio: 'inherit' },
    )
    const result2 = runCommand('snail-sh', ['rule', ' ', '50%', '1'], {
        cwd: repoRoot,
        stdio: 'inherit',
    })
    if (!result.success) {
        process.stdout.write(`\n🐌 ${packageName}\n\n`)
    }
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

runCliIfEntrypoint(import.meta, main, process.argv.slice(2))
