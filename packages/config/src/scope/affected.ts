#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { splitNonEmptyLines, uniqueSorted } from './../utilities/array.js'
import { runCommand } from './../utilities/command.js'
import { runCliIfEntrypointAsync } from './../utilities/entrypoint.js'
import { runPackageBinary } from './../utilities/package-manager.js'
import { getRepoRoot } from './../workspace/git.js'
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

type ParsedArgs = {
    changesetFiles: Array<string>
    includeNxScopes: boolean
    includeRepoScopes: boolean
    keepPrefix: boolean
    nxBase: string
    nxHead: string
    scopeFormat: ScopeFormat
}

export async function main(
    args: Array<string> = process.argv.slice(2),
): Promise<void> {
    const parsed = parseArgs(args)
    const repoRoot = getRepoRoot({ fallbackToCwd: true })

    const scopes = [
        ...(parsed.includeNxScopes
            ? collectNxAffectedScopes(repoRoot, parsed)
            : []),
        ...(parsed.includeRepoScopes
            ? collectDirtyRepoScopes(
                  repoRoot,
                  parsed.keepPrefix,
                  await loadScopePathMatchers(repoRoot),
              )
            : []),
        ...collectChangesetScopes(
            repoRoot,
            parsed.changesetFiles,
            parsed.keepPrefix,
        ),
    ]

    console.log(formatScopes(uniqueSorted(scopes), parsed.scopeFormat))
}

function collectChangesetScopes(
    repoRoot: string,
    changesetFiles: ReadonlyArray<string>,
    keepPrefix: boolean,
): Array<string> {
    return changesetFiles.flatMap((filePath) => {
        const relativePath = normalizeRepoPath(repoRoot, filePath)
        const absolutePath = path.isAbsolute(filePath)
            ? filePath
            : path.join(repoRoot, relativePath)

        if (!existsSync(absolutePath)) return []

        return parseChangesetPackageNames(
            readFileSync(absolutePath, 'utf8'),
        ).map((scope) => normalizeScopeName(scope, keepPrefix))
    })
}

function collectDirtyRepoScopes(
    repoRoot: string,
    keepPrefix: boolean,
    matchers: ScopePathMatchers,
): Array<string> {
    const staged = runCommand('git', ['diff', '--cached', '--name-only'], {
        cwd: repoRoot,
    }).stdout

    const unstaged = runCommand('git', ['diff', '--name-only'], {
        cwd: repoRoot,
    }).stdout

    const untracked = runCommand(
        'git',
        ['ls-files', '--others', '--exclude-standard'],
        {
            cwd: repoRoot,
        },
    ).stdout

    return splitNonEmptyLines(`${staged}\n${unstaged}\n${untracked}`).flatMap(
        (filePath) =>
            collectRepoScopesForPath(repoRoot, filePath, keepPrefix, matchers),
    )
}

function collectNxAffectedScopes(
    repoRoot: string,
    parsed: ParsedArgs,
): Array<string> {
    const nxArgs = ['show', 'projects', '--affected', '--base', parsed.nxBase]

    if (parsed.nxHead) nxArgs.push('--head', parsed.nxHead)

    const result = runPackageBinary(repoRoot, 'nx', nxArgs)

    if (result.status !== 0) return []

    return splitNonEmptyLines(result.stdout).map((scope) =>
        normalizeScopeName(scope, parsed.keepPrefix),
    )
}

function collectRepoScopesForPath(
    repoRoot: string,
    inputPath: string,
    keepPrefix: boolean,
    matchers: ScopePathMatchers,
): Array<string> {
    const relativePath = normalizeRepoPath(repoRoot, inputPath)
    const matchedScopes = matchScopesForPath(relativePath, matchers)

    if (matchedScopes.length > 0) return matchedScopes

    if (
        relativePath.startsWith('.changeset/') &&
        relativePath.endsWith('.md')
    ) {
        return collectChangesetScopes(repoRoot, [relativePath], keepPrefix)
    }

    return []
}

function normalizeScopeName(scopeName: string, keepPrefix: boolean): string {
    if (scopeName === '.') return 'root'
    if (isRootPackageName(scopeName)) return 'root'

    return shortenScopeName(scopeName, keepPrefix)
}

function parseArgs(args: Array<string>): ParsedArgs {
    const parsed: ParsedArgs = {
        changesetFiles: [],
        includeNxScopes: true,
        includeRepoScopes: true,
        keepPrefix: false,
        nxBase: 'main',
        nxHead: '',
        scopeFormat: 'csv',
    }

    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index]

        switch (arg) {
            case '--base':
            case '--since':
                parsed.nxBase = readNextValue(args, ++index, arg)
                break
            case '--changeset':
            case '--changeset-file':
                parsed.changesetFiles.push(readNextValue(args, ++index, arg))
                break
            case '--changeset-only':
                parsed.includeNxScopes = false
                parsed.includeRepoScopes = false
                parsed.changesetFiles.push(readNextValue(args, ++index, arg))
                break
            case '--csv':
                parsed.scopeFormat = 'csv'
                break
            case '--full-scope':
            case '--keep-prefix':
                parsed.keepPrefix = true
                break
            case '--head':
                parsed.nxHead = readNextValue(args, ++index, arg)
                break
            case '--help':
            case '-h':
                printHelp()
                process.exit(0)
                break
            case '--include-repo-scopes':
                parsed.includeRepoScopes = true
                break
            case '--list':
                parsed.scopeFormat = 'list'
                break
            case '--no-nx':
                parsed.includeNxScopes = false
                break
            case '--no-repo-scopes':
            case '--nx-only':
                parsed.includeRepoScopes = false
                break
            default:
                if (arg.startsWith('--')) {
                    throw new Error(`Unknown argument: ${arg}`)
                }

                throw new Error(`Unknown argument: ${arg}`)
        }
    }

    return parsed
}

function parseChangesetPackageNames(markdown: string): Array<string> {
    const lines = markdown.replaceAll('\r', '').split('\n')

    if (lines[0] !== '---') return []

    const packageNames: Array<string> = []

    for (const line of lines.slice(1)) {
        if (line === '---') break

        const match =
            /^["']?([^"':]+)["']?:\s*(?:major|minor|patch|none)\s*$/.exec(
                line.trim(),
            )

        if (match?.[1]) packageNames.push(match[1])
    }

    return packageNames
}

function printHelp(): void {
    console.log(`Usage:
  scope-affected [--csv|--list] [--keep-prefix] [--nx-only|--include-repo-scopes] [--base <ref>|--since <ref>] [--head <ref>]
  scope-affected --changeset <file> [--no-nx]
  scope-affected --changeset-only <file>

Examples:
  scope-affected
  scope-affected --list
  scope-affected --since v1.0.0
  scope-affected --keep-prefix
  scope-affected --nx-only
  scope-affected --base v1.0.0 --head HEAD
  scope-affected --changeset-only .changeset/example.md`)
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

export default main

await runCliIfEntrypointAsync(import.meta, main, process.argv.slice(2))
