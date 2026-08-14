#!/usr/bin/env node

import { runCliIfEntrypointAsync } from '@snailicid3/node-utils'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { splitNonEmptyLines, uniqueSorted } from './../core/array.js'
import { getGitChangedFiles, getRepoRoot } from './../core/git.js'
import { runPackageBinary } from './../core/package-manager.js'
import {
    getWorkspaceSnapshot,
    type WorkspaceSnapshot,
} from './../core/packages.js'
import { resolveRepositoryScopes } from './../core/repository-scopes.js'
import { loadScopePathMatchers } from './../core/scope-matcher-config.js'
import {
    formatScopes,
    type ScopeFormat,
    shortenScopeName,
} from './../core/scopes.js'
import {
    getWorkspaceScopes,
    type ResolvedWorkspaceScopes,
} from './../core/workspace-scopes.js'

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
    // Discovery shells out to the package manager, so it is resolved once and only when a selected
    // mode actually needs it.
    let cachedSnapshot: undefined | WorkspaceSnapshot
    const snapshot = (): WorkspaceSnapshot =>
        (cachedSnapshot ??= getWorkspaceSnapshot(repoRoot))

    const scopes = [
        ...(parsed.includeNxScopes
            ? collectNxAffectedScopes(repoRoot, parsed, snapshot())
            : []),
        ...(parsed.includeRepoScopes
            ? collectDirtyRepoScopes(
                  repoRoot,
                  parsed.keepPrefix,
                  getWorkspaceScopes({
                      keepPrefix: parsed.keepPrefix,
                      overrides: await loadScopePathMatchers(repoRoot),
                      snapshot: snapshot(),
                  }),
                  snapshot,
              )
            : []),
        ...collectChangesetScopes(
            repoRoot,
            parsed.changesetFiles,
            parsed.keepPrefix,
            snapshot,
        ),
    ]

    console.log(formatScopes(uniqueSorted(scopes), parsed.scopeFormat))
}

function collectChangesetScopes(
    repoRoot: string,
    changesetFiles: ReadonlyArray<string>,
    keepPrefix: boolean,
    snapshot: () => WorkspaceSnapshot,
): Array<string> {
    return changesetFiles.flatMap((filePath) => {
        // An explicitly supplied changeset file may legitimately sit outside the repository, and
        // its scopes come from the file's contents rather than its path, so no containment check
        // applies here.
        const absolutePath = path.resolve(repoRoot, filePath)

        if (!existsSync(absolutePath)) return []

        return parseChangesetPackageNames(
            readFileSync(absolutePath, 'utf8'),
        ).map((scope) => normalizeScopeName(scope, keepPrefix, snapshot()))
    })
}

function collectDirtyRepoScopes(
    repoRoot: string,
    keepPrefix: boolean,
    resolved: ResolvedWorkspaceScopes,
    snapshot: () => WorkspaceSnapshot,
): Array<string> {
    // The same changed-file input scope-commit uses, rather than a second interpretation of it.
    const changedFiles = getGitChangedFiles({ cwd: repoRoot })
    const resolution = resolveRepositoryScopes(
        changedFiles,
        resolved.classifiers,
    )
    const matched = new Set(Object.values(resolution.matches).flat())

    // A changeset file names its own packages; unmatched ones fall back to reading it.
    const changesetScopes = changedFiles
        .filter(
            (file) =>
                !matched.has(file) &&
                file.startsWith('.changeset/') &&
                file.endsWith('.md'),
        )
        .flatMap((file) =>
            collectChangesetScopes(repoRoot, [file], keepPrefix, snapshot),
        )

    return [
        ...Object.entries(resolution.matches)
            .filter(([, files]) => files.length > 0)
            .map(([scope]) => scope),
        ...changesetScopes,
    ]
}

function collectNxAffectedScopes(
    repoRoot: string,
    parsed: ParsedArgs,
    snapshot: WorkspaceSnapshot,
): Array<string> {
    const nxArgs = ['show', 'projects', '--affected', '--base', parsed.nxBase]

    if (parsed.nxHead) nxArgs.push('--head', parsed.nxHead)

    const result = runPackageBinary(repoRoot, 'nx', nxArgs)

    if (result.status !== 0) return []

    return splitNonEmptyLines(result.stdout).map((projectName) =>
        normalizeScopeName(projectName, parsed.keepPrefix, snapshot),
    )
}

/**
 * Map an Nx project name to a commit scope.
 *
 * Root is decided by the package's normalized path, not by its name: a nested package may legitimately be called
 * `@scope/root`. Nx reports bare project names with no path attached, so the name is resolved back to a package record
 * through the snapshot first.
 */
function normalizeScopeName(
    projectName: string,
    keepPrefix: boolean,
    snapshot: WorkspaceSnapshot,
): string {
    if (projectName === '.') return 'root'

    const workspacePackage = snapshot.lookup.get(projectName)

    if (workspacePackage?.path === '.') return 'root'

    return shortenScopeName(projectName, keepPrefix)
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
