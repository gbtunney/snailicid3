#!/usr/bin/env node

import path from 'node:path'
import { runCliIfEntrypoint } from './../utilities/entrypoint.js'
import {
    findNearestPackageJson,
    formatScopes,
    getRepoRoot,
    isRootPackageName,
    normalizeRepoPath,
    readPackageName,
    runCommand,
    type ScopeFormat,
    shortenScopeName,
    splitLines,
    uniqueSorted,
} from './lib.js'

type ChangeMode = 'all' | 'staged'
type OutputMode = 'commit' | 'message' | 'scope'

type ParsedArgs = {
    dryRun: boolean
    keepPrefix: boolean
    mode: ChangeMode
    outputMode: OutputMode
    positionals: Array<string>
    runCommitBefore: boolean
    scopeFormat: ScopeFormat
    validateOnly: boolean
}

export function main(args = process.argv.slice(2)): void {
    const parsed = parseArgs(args)
    const repoRoot = getRepoRoot()
    if (parsed.validateOnly) {
        const [type] = parsed.positionals

        if (!type) throw new Error('--validate-type requires <type>')

        validateCommitMessage(repoRoot, makeMessage(type, 'root', 'test'))
        return
    }

    let inputPaths = parsed.positionals
    let commitType = ''
    let commitSubject = ''

    if (parsed.outputMode === 'message' || parsed.outputMode === 'commit') {
        const [type, subject, ...rest] = parsed.positionals

        if (!type || !subject) {
            throw new Error(
                `--${parsed.outputMode} requires <type> and <subject>`,
            )
        }

        commitType = type
        commitSubject = subject
        inputPaths = rest
    }

    if (parsed.runCommitBefore) {
        runCheckedPrecommit(repoRoot)
    }

    const paths =
        inputPaths.length > 0
            ? inputPaths
            : collectChangedPaths(repoRoot, parsed.mode)

    const scopes =
        paths.length > 0
            ? collectScopes(repoRoot, paths, parsed.keepPrefix)
            : ['root']

    const scopeValue = formatScopes(scopes, 'csv')

    if (parsed.outputMode === 'message' || parsed.outputMode === 'commit') {
        const message = makeMessage(commitType, scopeValue, commitSubject)

        validateCommitMessage(repoRoot, message)

        if (parsed.outputMode === 'message' || parsed.dryRun) {
            console.log(message)
            return
        }

        const result = runCommand('git', ['commit', '-m', message], {
            cwd: repoRoot,
        })

        if (result.status !== 0) {
            throw new Error(
                result.stderr || result.stdout || 'git commit failed',
            )
        }

        process.stdout.write(result.stdout)
        return
    }

    console.log(formatScopes(scopes, parsed.scopeFormat))
}

function collectChangedPaths(
    repoRoot: string,
    mode: ChangeMode,
): Array<string> {
    if (mode === 'staged') {
        return splitLines(
            runCommand('git', ['diff', '--cached', '--name-only'], {
                cwd: repoRoot,
            }).stdout,
        )
    }

    const staged = runCommand('git', ['diff', '--cached', '--name-only'], {
        cwd: repoRoot,
    }).stdout

    const unstaged = runCommand('git', ['diff', '--name-only'], {
        cwd: repoRoot,
    }).stdout

    const untracked = runCommand(
        'git',
        ['ls-files', '--others', '--exclude-standard'],
        { cwd: repoRoot },
    ).stdout

    return splitLines(`${staged}\n${unstaged}\n${untracked}`)
}

function collectScopes(
    repoRoot: string,
    paths: ReadonlyArray<string>,
    keepPrefix: boolean,
): Array<string> {
    return uniqueSorted(
        paths.map((filePath) => scopeForPath(repoRoot, filePath, keepPrefix)),
    )
}

function makeMessage(
    type: string,
    scopeValue: string,
    subject: string,
): string {
    return `${type}(${scopeValue}): ${subject}`
}

function parseArgs(args: Array<string>): ParsedArgs {
    const parsed: ParsedArgs = {
        dryRun: false,
        keepPrefix: false,
        mode: 'staged',
        outputMode: 'scope',
        positionals: [],
        runCommitBefore: false,
        scopeFormat: 'csv',
        validateOnly: false,
    }

    for (const arg of args) {
        switch (arg) {
            case '--all':
                parsed.mode = 'all'
                break
            case '--c':
            case '--commit':
                parsed.outputMode = 'commit'
                break

            case '--cached':
            case '--staged':
                parsed.mode = 'staged'
                break

            case '--check-type':
            case '--validate':
            case '--validate-type':
                parsed.validateOnly = true
                break
            case '--checked-commit':
            case '--commit-checked':
                parsed.outputMode = 'commit'
                parsed.runCommitBefore = true
                break

            case '--csv':
                parsed.scopeFormat = 'csv'
                break
            case '--dry':
            case '--dry-run':
            case '-n':
                parsed.dryRun = true
                break
            case '--full-scope':
            case '--keep-prefix':
                parsed.keepPrefix = true
                break
            case '--help':
            case '-h':
                printHelp()
                process.exit(0)
                break
            case '--list':
                parsed.scopeFormat = 'list'
                break

            case '--m':
            case '--message':
                parsed.outputMode = 'message'
                break

            default:
                if (arg.startsWith('--')) {
                    throw new Error(`Unknown argument: ${arg}`)
                }

                parsed.positionals.push(arg)
                break
        }
    }

    return parsed
}

function printHelp(): void {
    console.log(`Usage:
  pnpm exec scope-commit [--staged|--all] [--csv|--list] [--keep-prefix] [file ...]
  pnpm exec scope-commit --validate-type <type>
  pnpm exec scope-commit --message <type> <subject> [--staged|--all] [--keep-prefix] [file ...]
  pnpm exec scope-commit --commit <type> <subject> [--staged|--all] [--keep-prefix] [--dry-run] [file ...]
  pnpm exec scope-commit --checked-commit <type> <subject> [--staged|--all] [--keep-prefix] [--dry-run] [file ...]

Examples:
  pnpm exec scope-commit
  pnpm exec scope-commit --all
  pnpm exec scope-commit --list
  pnpm exec scope-commit --csv --keep-prefix
  pnpm exec scope-commit --message chore autofix
  pnpm exec scope-commit --commit --dry-run chore autofix
  pnpm exec scope-commit --checked-commit chore autofix
  pnpm exec scope-commit .github/workflows/call-pipeline.yml`)
}

function runCheckedPrecommit(repoRoot: string): void {
    const stagedDiff = runCommand('git', ['diff', '--cached', '--quiet'], {
        cwd: repoRoot,
    })

    if (stagedDiff.status === 0) {
        const addResult = runCommand('git', ['add', '-A'], { cwd: repoRoot })

        if (addResult.status !== 0) {
            throw new Error(addResult.stderr || 'git add -A failed')
        }
    }

    const lintResult = runCommand(
        'pnpm',
        ['exec', 'lint-staged', '--debug', '--relative'],
        { cwd: repoRoot, stdio: 'inherit' },
    )

    if (lintResult.status !== 0) {
        throw new Error(
            lintResult.stderr || lintResult.stdout || 'lint-staged failed',
        )
    }
}

function scopeForPath(
    repoRoot: string,
    inputPath: string,
    keepPrefix: boolean,
): string {
    const relativePath = normalizeRepoPath(repoRoot, inputPath)

    if (
        relativePath.startsWith('.github/workflows/') ||
        relativePath.startsWith('.github/actions/') ||
        relativePath.startsWith('.github/scripts/')
    ) {
        return 'actions'
    }

    if (relativePath.startsWith('notes/')) return 'notes'
    if (relativePath.startsWith('scripts/')) return 'scripts'

    const packageJsonPath = findNearestPackageJson(repoRoot, relativePath)

    if (!packageJsonPath) return 'root'
    if (path.dirname(packageJsonPath) === repoRoot) return 'root'

    const packageName = readPackageName(packageJsonPath)

    if (!packageName) return 'root'
    if (isRootPackageName(packageName)) return 'root'

    return shortenScopeName(packageName, keepPrefix)
}

function validateCommitMessage(repoRoot: string, message: string): void {
    if (process.env.SCOPE_COMMIT_SKIP_COMMITLINT === '1') return

    const result = runCommand(
        'pnpm',
        ['exec', 'commitlint', '--cwd', repoRoot],
        {
            cwd: repoRoot,
            input: `${message}\n`,
        },
    )

    if (result.status !== 0) {
        throw new Error(
            [
                'invalid commit message:',
                `  ${message}`,
                result.stderr.trim(),
                result.stdout.trim(),
            ]
                .filter(Boolean)
                .join('\n'),
        )
    }
}

export default main

/*
console.log({
    argv: process.argv,
    isEntrypoint: isCallerEntrypoint(import.meta, { log: true }),
})
*/
runCliIfEntrypoint(import.meta, main, process.argv.slice(2))
