#!/usr/bin/env node

/**
 * - Pnpm commit:feat
 * - build required binaries
 * - stage the complete working tree
 * - calculate scopes
 * - run git commit with
 * - live terminal output → Husky runs lint-staged once using .lintstagedrc.mts → commitlint validates the message
 */
import { runCliIfEntrypointAsync, safeParseArgv } from '@snailicid3/node-utils'
import { z } from 'zod'
import {
    performCommit,
    requireStagedChanges,
    validateCommitMessage,
} from './../core/commit-exec.js'
import { resolveScopesForFiles } from './../core/commit-scope.js'
import { getGitChangedFiles, getRepoRoot } from './../core/git.js'
import { type RepositoryScopeResolution } from './../core/repository-scopes.js'
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
    overrideScopes?: ReadonlyArray<string>,
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

    lines.push('', `detected: ${formatScopes(resolution.scopes, 'csv')}`)

    if (overrideScopes) {
        lines.push(`override: ${formatScopes(overrideScopes, 'csv')}`)

        const dropped = resolution.scopes.filter(
            (scope) => !overrideScopes.includes(scope),
        )

        if (dropped.length > 0) {
            lines.push(`dropped by override: ${formatScopes(dropped, 'csv')}`)
        }
    }

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
        requireStagedChanges(repoRoot)
    }

    const files = resolveInputFiles(
        request.inputPaths,
        parsed.mode,
        getGitChangedFiles,
        repoRoot,
    )
    const detected = await resolveScopesForFiles(repoRoot, files, {
        keepPrefix: parsed.keepPrefix,
    })
    // An explicit scope overrides which scopes are used, but detection still runs so the report can
    // show what the files actually touch — including scopes the override leaves out.
    const resolution = parsed.explicitScope
        ? {
              ...detected,
              scopes: splitExplicitScope(parsed.explicitScope),
          }
        : detected

    if (parsed.verbose) {
        const inputSource =
            request.inputPaths.length > 0 ? 'explicit' : parsed.mode
        // Stderr: stdout carries the machine-readable scope value that callers capture.
        process.stderr.write(
            `${formatScopeEvidence(files, detected, inputSource, parsed.explicitScope ? resolution.scopes : undefined)}\n`,
        )
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
    cwd?: string,
): Array<string> {
    if (inputPaths.length > 0) return [...inputPaths]

    return getChangedFiles({
        ...(cwd === undefined ? {} : { cwd }),
        includeStaged: true,
        includeUnstaged: mode === 'all',
        includeUntracked: mode === 'all',
    })
}

function makeMessage(
    type: string,
    scopeValue: string,
    subject: string,
): string {
    return `${type}(${scopeValue}): ${subject}`
}

const optionsSchema = z.strictObject({
    all: z.boolean().optional(),
    c: z.boolean().optional(),
    cached: z.boolean().optional(),
    checkedCommit: z.boolean().optional(),
    checkType: z.boolean().optional(),
    commit: z.boolean().optional(),
    commitChecked: z.boolean().optional(),
    csv: z.boolean().optional(),
    debug: z.boolean().optional(),
    dry: z.boolean().optional(),
    dryRun: z.boolean().optional(),
    fullScope: z.boolean().optional(),
    h: z.boolean().optional(),
    help: z.boolean().optional(),
    keepPrefix: z.boolean().optional(),
    list: z.boolean().optional(),
    m: z.boolean().optional(),
    message: z.boolean().optional(),
    n: z.boolean().optional(),
    scope: z.string().optional(),
    staged: z.boolean().optional(),
    validate: z.boolean().optional(),
    validateType: z.boolean().optional(),
    verbose: z.boolean().optional(),
})

/**
 * Translate argv into the command's typed shape.
 *
 * Every historical alias is preserved deliberately; the audit noted they should be reviewed, but dropping one silently
 * is a behaviour change, so that is a separate decision.
 */
function parseArgs(args: Array<string>): ParsedArgs {
    const parsed = safeParseArgv(optionsSchema, args, z.array(z.string()))

    if (!parsed.success) {
        // Preserve the original wording: package scripts and consumers match on it.
        const unknown = parsed.error.issues.find(
            (issue) => issue.code === 'unrecognized_keys',
        )
        const unknownKey =
            unknown && 'keys' in unknown
                ? (unknown.keys as ReadonlyArray<string>)[0]
                : undefined

        if (unknownKey !== undefined) {
            const flag = args.find(
                (arg) =>
                    arg.startsWith('--') &&
                    arg.replace(/^--/u, '').replace(/=.*$/u, '') ===
                        unknownKey.replace(
                            /[A-Z]/gu,
                            (letter) => `-${letter.toLowerCase()}`,
                        ),
            )

            throw new Error(`Unknown argument: ${flag ?? `--${unknownKey}`}`)
        }

        throw new Error(`invalid arguments:\n${z.prettifyError(parsed.error)}`)
    }

    const options = parsed.data.options

    if (options.help === true || options.h === true) {
        printHelp()
        process.exit(0)
    }

    const wantsCheckedCommit =
        options.checkedCommit === true || options.commitChecked === true

    return {
        dryRun:
            options.dryRun === true ||
            options.dry === true ||
            options.n === true,
        explicitScope: options.scope ?? '',
        keepPrefix: options.keepPrefix === true || options.fullScope === true,
        mode: options.all === true ? 'all' : 'staged',
        outputMode:
            options.message === true || options.m === true
                ? 'message'
                : options.commit === true ||
                    options.c === true ||
                    wantsCheckedCommit
                  ? 'commit'
                  : 'scope',
        positionals: parsed.data.positionals,
        runCommitBefore: wantsCheckedCommit,
        scopeFormat: options.list === true ? 'list' : 'csv',
        validateOnly:
            options.validate === true ||
            options.validateType === true ||
            options.checkType === true,
        verbose: options.verbose === true || options.debug === true,
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

function splitExplicitScope(scopeValue: string): Array<string> {
    return scopeValue
        .split(',')
        .map((scope) => scope.trim())
        .filter(Boolean)
}

export default main

await runCliIfEntrypointAsync(import.meta, main, process.argv.slice(2))
