#!/usr/bin/env node

/**
 * - Pnpm commit:feat
 * - build required binaries
 * - stage the complete working tree
 * - calculate scopes
 * - run git commit with
 * - live terminal output → Husky runs lint-staged once using .lintstagedrc.mts → commitlint validates the message
 */
import { runCliIfEntrypointAsync, runCommand } from '@snailicid3/node-utils'
import { readWorkspaceEnvironment } from './../core/environment.js'
import { getGitChangedFiles, getRepoRoot } from './../core/git.js'
import { runPackageBinary } from './../core/package-manager.js'
import {
    createRepositoryScopeClassifiers,
    type RepositoryScopeResolution,
    resolveRepositoryScopes,
} from './../core/repository-scopes.js'
import { loadScopePathMatchers } from './../core/scope-matcher-config.js'
import { formatScopes, type ScopeFormat } from './../core/scopes.js'

export type ChangeMode = 'all' | 'staged'
export type FileInputSource = 'explicit' | ChangeMode
type CommitRequest = {
    inputPaths: Array<string>
    subject: string
    type: string
}

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
    verbose: boolean
}

export function formatScopeEvidence(
    files: ReadonlyArray<string>,
    resolution: RepositoryScopeResolution,
    inputSource: FileInputSource,
): string {
    const lines = [`${inputSource} files: ${files.length.toString()}`]

    for (const [scope, matches] of Object.entries(resolution.matches)) {
        if (matches.length === 0) continue
        lines.push('', scope, ...matches.map((file) => `  ${file}`))
    }

    if (resolution.unmatched.length > 0) {
        lines.push(
            '',
            'unmatched/root',
            ...resolution.unmatched.map((file) => `  ${file}`),
        )
    }

    lines.push('', `scopes: ${formatScopes(resolution.scopes, 'csv')}`)
    return lines.join('\n')
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

    const request = resolveCommitRequest(parsed)

    if (parsed.runCommitBefore) {
        prepareCheckedCommit(repoRoot)
    }

    const files = parsed.explicitScope
        ? [...request.inputPaths]
        : resolveInputFiles(request.inputPaths, parsed.mode)
    const resolution = parsed.explicitScope
        ? explicitScopeResolution(parsed.explicitScope)
        : await resolveScopesForFiles(repoRoot, files, parsed.keepPrefix)

    if (parsed.verbose) {
        const inputSource =
            request.inputPaths.length > 0 ? 'explicit' : parsed.mode
        console.log(formatScopeEvidence(files, resolution, inputSource))
    }

    const scopeValue = formatScopes(resolution.scopes, 'csv')

    if (parsed.outputMode === 'message' || parsed.outputMode === 'commit') {
        const message = makeMessage(request.type, scopeValue, request.subject)

        validateCommitMessage(repoRoot, message)

        if (parsed.outputMode === 'message' || parsed.dryRun) {
            console.log(message)
            return
        }

        performCommit(repoRoot, message)
        return
    }

    console.log(formatScopes(resolution.scopes, parsed.scopeFormat))
}

export function resolveInputFiles(
    inputPaths: ReadonlyArray<string>,
    mode: ChangeMode,
    getChangedFiles: typeof getGitChangedFiles = getGitChangedFiles,
): Array<string> {
    if (inputPaths.length > 0) return [...inputPaths]

    return getChangedFiles({
        includeStaged: true,
        includeUnstaged: mode === 'all',
        includeUntracked: mode === 'all',
    })
}

function explicitScopeResolution(
    scopeValue: string,
): RepositoryScopeResolution {
    return {
        matches: {},
        scopes: splitExplicitScope(scopeValue),
        unmatched: [],
    }
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
        verbose: false,
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
            case '--debug':
            case '--verbose':
                parsed.verbose = true
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

function performCommit(repoRoot: string, message: string): void {
    const result = runCommand('git', ['commit', '-m', message], {
        cwd: repoRoot,
        stdio: 'inherit',
    })

    if (result.status !== 0) throw new Error('git commit failed')

    process.stdout.write(result.stdout)
}

function prepareCheckedCommit(repoRoot: string): void {
    const stagedDiff = runCommand('git', ['diff', '--cached', '--quiet'], {
        cwd: repoRoot,
    })

    if (stagedDiff.status === 0) {
        throw new Error(
            'Nothing is staged. Stage the files you want to commit first.',
        )
    }

    if (stagedDiff.status !== 1) {
        throw new Error(stagedDiff.stderr || 'Unable to inspect staged files')
    }
}

function printHelp(): void {
    console.log(`Usage:
  scope-commit [--staged|--all] [--csv|--list] [--keep-prefix] [--verbose] [file ...]
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

function resolveCommitRequest(parsed: ParsedArgs): CommitRequest {
    if (parsed.outputMode === 'scope') {
        return { inputPaths: parsed.positionals, subject: '', type: '' }
    }

    const [type, subject, ...inputPaths] = parsed.positionals
    if (!type || !subject) {
        throw new Error(`--${parsed.outputMode} requires <type> and <subject>`)
    }

    return { inputPaths, subject, type }
}

async function resolveScopesForFiles(
    repoRoot: string,
    files: ReadonlyArray<string>,
    keepPrefix: boolean,
): Promise<RepositoryScopeResolution> {
    if (files.length === 0)
        return { matches: {}, scopes: ['root'], unmatched: [] }

    const customClassifiers = await loadScopePathMatchers(repoRoot)
    const classifiers = createRepositoryScopeClassifiers(
        repoRoot,
        customClassifiers,
        keepPrefix,
    )

    return resolveRepositoryScopes(files, classifiers)
}

function splitExplicitScope(scopeValue: string): Array<string> {
    return scopeValue
        .split(',')
        .map((scope) => scope.trim())
        .filter(Boolean)
}

function validateCommitMessage(repoRoot: string, message: string): void {
    if (readWorkspaceEnvironment(process.env).skipCommitlint) return

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

await runCliIfEntrypointAsync(import.meta, main, process.argv.slice(2))
