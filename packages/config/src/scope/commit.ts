#!/usr/bin/env node

/**
 * Pnpm commit:feat → build required binaries → stage the complete working tree → calculate scopes → run git commit with
 * live terminal output → Husky runs lint-staged once using .lintstagedrc.mts → commitlint validates the message
 */
import { runCliIfEntrypointAsync, runCommand } from '@snailicid3/node-utils'
import path from 'node:path'
import { splitNonEmptyLines, uniqueSorted } from './../utilities/array.js'
import { readConfigEnvironment } from './../utilities/environment.js'
import { runPackageBinary } from './../utilities/package-manager.js'
import { getRepoRoot } from './../workspace/git.js'
import {
    findNearestPackageJson,
    readPackageName,
} from './../workspace/packages.js'
import { normalizeRepoPath } from './../workspace/paths.js'
import { loadScopePathMatchers } from './../workspace/scope-matcher-config.js'
import {
    matchScopesForPath,
    type ScopePathMatchers,
} from './../workspace/scope-matchers.js'
import {
    formatScopes,
    isRootPackageName,
    type ScopeFormat,
    shortenScopeName,
} from './../workspace/scopes.js'

type ChangeMode = 'all' | 'staged'
type OutputMode = 'commit' | 'message' | 'scope'

type ParsedArgs = {
    dryRun: boolean
    explicitScope: string
    keepPrefix: boolean
    mode: ChangeMode
    outputMode: OutputMode
    positionals: Array<string>
    runCommitBefore: boolean
    scopeFormat: ScopeFormat
    validateOnly: boolean
}

export async function main(
    args: Array<string> = process.argv.slice(2),
): Promise<void> {
    const parsed = parseArgs(args)
    const repoRoot = getRepoRoot({ fallbackToCwd: true })
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
        prepareCheckedCommit(repoRoot)
    }

    const scopes = parsed.explicitScope
        ? splitExplicitScope(parsed.explicitScope)
        : collectScopesForInput(
              repoRoot,
              inputPaths,
              parsed,
              await loadScopePathMatchers(repoRoot),
          )
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
            stdio: 'inherit',
        })

        if (result.status !== 0) {
            throw new Error('git commit failed')
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
        return splitNonEmptyLines(
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

    return splitNonEmptyLines(`${staged}\n${unstaged}\n${untracked}`)
}

function collectScopes(
    repoRoot: string,
    paths: ReadonlyArray<string>,
    keepPrefix: boolean,
    matchers: ScopePathMatchers,
): Array<string> {
    return uniqueSorted(
        paths.flatMap((filePath) =>
            scopesForPath(repoRoot, filePath, keepPrefix, matchers),
        ),
    )
}

function collectScopesForInput(
    repoRoot: string,
    inputPaths: ReadonlyArray<string>,
    parsed: ParsedArgs,
    matchers: ScopePathMatchers,
): Array<string> {
    const paths =
        inputPaths.length > 0
            ? inputPaths
            : collectChangedPaths(repoRoot, parsed.mode)

    return paths.length > 0
        ? collectScopes(repoRoot, paths, parsed.keepPrefix, matchers)
        : ['root']
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
        explicitScope: '',
        keepPrefix: false,
        mode: 'staged',
        outputMode: 'scope',
        positionals: [],
        runCommitBefore: false,
        scopeFormat: 'csv',
        validateOnly: false,
    }

    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index]

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

            case '--scope':
                parsed.explicitScope = readNextValue(args, ++index, arg)
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

function prepareCheckedCommit(repoRoot: string): void {
    const addResult = runCommand('git', ['add', '-A'], { cwd: repoRoot })

    if (addResult.status !== 0) {
        throw new Error(addResult.stderr || 'git add -A failed')
    }
}

function printHelp(): void {
    console.log(`Usage:
  scope-commit [--staged|--all] [--csv|--list] [--keep-prefix] [file ...]
  scope-commit --validate-type <type>
  scope-commit --message <type> <subject> [--staged|--all] [--keep-prefix] [file ...]
  scope-commit --commit <type> <subject> [--scope <scope>] [--staged|--all] [--keep-prefix] [--dry-run] [file ...]
  scope-commit --checked-commit <type> <subject> [--scope <scope>] [--staged|--all] [--keep-prefix] [--dry-run] [file ...]

Examples:
  scope-commit
  scope-commit --all
  scope-commit --list
  scope-commit --csv --keep-prefix
  scope-commit --message chore autofix
  scope-commit --commit --dry-run chore autofix
  scope-commit --message chore autofix --scope config
  scope-commit --checked-commit chore autofix
  scope-commit .github/workflows/call-pipeline.yml`)
}

function readNextValue(
    args: ReadonlyArray<string>,
    index: number,
    flag: string,
): string {
    const value = args[index]

    if (!value || value.startsWith('--')) {
        throw new Error(`${flag} requires a value`)
    }

    return value
}
function scopesForPath(
    repoRoot: string,
    inputPath: string,
    keepPrefix: boolean,
    matchers: ScopePathMatchers,
): Array<string> {
    const relativePath = normalizeRepoPath(repoRoot, inputPath)
    const matchedScopes = matchScopesForPath(relativePath, matchers)

    if (matchedScopes.length > 0) return matchedScopes

    const packageJsonPath = findNearestPackageJson(repoRoot, relativePath)

    if (!packageJsonPath) return ['root']
    if (path.dirname(packageJsonPath) === repoRoot) return ['root']

    const packageName = readPackageName(packageJsonPath)

    if (!packageName) return ['root']
    if (isRootPackageName(packageName)) return ['root']

    return [shortenScopeName(packageName, keepPrefix)]
}

function splitExplicitScope(scopeValue: string): Array<string> {
    return scopeValue
        .split(',')
        .map((scope) => scope.trim())
        .filter(Boolean)
}

function validateCommitMessage(repoRoot: string, message: string): void {
    if (readConfigEnvironment().skipCommitlint) return

    const result = runPackageBinary(
        repoRoot,
        'commitlint',
        ['--cwd', repoRoot],
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
Console.log({
    argv: process.argv,
    isEntrypoint: isCallerEntrypoint(import.meta, { log: true }),
})
*/
await runCliIfEntrypointAsync(import.meta, main, process.argv.slice(2))
