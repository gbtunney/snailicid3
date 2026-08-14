#!/usr/bin/env node

import { runCliIfEntrypointAsync, safeParseArgv } from '@snailicid3/node-utils'
import { z } from 'zod'
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

const toStringArray = (
    value: ReadonlyArray<string> | string | undefined,
): Array<string> =>
    value === undefined ? [] : typeof value === 'string' ? [value] : [...value]

const changesetValue = z.union([z.string(), z.array(z.string())]).optional()

const optionsSchema = z.strictObject({
    base: z.string().optional(),
    changeset: changesetValue,
    changesetFile: changesetValue,
    changesetOnly: changesetValue,
    csv: z.boolean().optional(),
    fullScope: z.boolean().optional(),
    h: z.boolean().optional(),
    head: z.string().optional(),
    help: z.boolean().optional(),
    includeRepoScopes: z.boolean().optional(),
    keepPrefix: z.boolean().optional(),
    list: z.boolean().optional(),
    // Yargs' boolean-negation turns `--no-nx` and `--no-repo-scopes` into these set to false.
    nx: z.boolean().optional(),
    nxOnly: z.boolean().optional(),
    repoScopes: z.boolean().optional(),
    since: z.string().optional(),
})

/** Translate argv into the command's typed shape, preserving every historical alias. */
function parseArgs(args: Array<string>): ParsedArgs {
    const parsed = safeParseArgv(optionsSchema, args, z.array(z.string()))

    if (!parsed.success) {
        const unrecognized = parsed.error.issues.find(
            (issue) => issue.code === 'unrecognized_keys',
        )
        const unknownKey =
            unrecognized && 'keys' in unrecognized
                ? (unrecognized.keys as ReadonlyArray<string>)[0]
                : undefined

        if (unknownKey !== undefined) {
            throw new Error(
                `Unknown argument: --${unknownKey.replace(
                    /[A-Z]/gu,
                    (letter) => `-${letter.toLowerCase()}`,
                )}`,
            )
        }

        throw new Error(`invalid arguments:\n${z.prettifyError(parsed.error)}`)
    }

    const options = parsed.data.options

    if (options.help === true || options.h === true) {
        printHelp()
        process.exit(0)
    }

    if (parsed.data.positionals.length > 0) {
        throw new Error(`Unknown argument: ${parsed.data.positionals[0] ?? ''}`)
    }

    const changesetOnly = toStringArray(options.changesetOnly)
    const changesetFiles = [
        ...toStringArray(options.changeset),
        ...toStringArray(options.changesetFile),
        ...changesetOnly,
    ]
    const onlyChangesets = changesetOnly.length > 0

    return {
        changesetFiles,
        includeNxScopes: !onlyChangesets && options.nx !== false,
        includeRepoScopes:
            options.includeRepoScopes === true ||
            (!onlyChangesets &&
                options.repoScopes !== false &&
                options.nxOnly !== true),
        keepPrefix: options.keepPrefix === true || options.fullScope === true,
        nxBase: options.base ?? options.since ?? 'main',
        nxHead: options.head ?? '',
        scopeFormat: options.list === true ? 'list' : 'csv',
    }
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

export default main

await runCliIfEntrypointAsync(import.meta, main, process.argv.slice(2))
