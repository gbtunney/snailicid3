#!/usr/bin/env node

import {
    getLogger,
    kabob,
    kvPair,
    line,
    section,
    spacer,
} from '@snailicid3/logger'
import {
    runCliIfEntrypoint,
    runCommand,
    runCommandOrThrow,
    safeParseArgv,
} from '@snailicid3/node-utils'
/** Node/Zod implementation of the legacy changeset-branch.sh workflow. */
import { fmt } from '@snailicid3/utils'
import { z } from 'zod'
import { readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { createBranchFromBase, switchBranch } from './../core/branch-actions.js'
import { localBranchExists } from './../core/branch-state.js'
import { readWorkspaceEnvironment } from './../core/environment.js'
import { detectDefaultBranch, getRepoRoot } from './../core/git.js'
import { runPackageBinary } from './../core/package-manager.js'

export const optionsSchema = z.strictObject({
    allowDirty: z.boolean().optional(),
    base: z.string().optional(),
    h: z.boolean().optional(),
    help: z.boolean().optional(),
    prefix: z.string().optional(),
})

type Options = z.output<typeof optionsSchema>

const HELP = `Usage:
  gbt-changeset [--base <branch>] [--prefix <prefix>] [--allow-dirty]

Creates exactly one changeset file, attaches changeset/<slug>, and stops.
It does not stage, commit, push, or create a pull request.`

const write = (value: string): void => {
    process.stdout.write(value)
}

const runOrThrow = (
    command: string,
    args: ReadonlyArray<string>,
    cwd: string,
): string => runCommandOrThrow(command, args, { cwd })

const listChangesets = (repoRoot: string): Array<string> => {
    const directory = join(repoRoot, '.changeset')
    return readdirSync(directory)
        .filter((file) => file.endsWith('.md'))
        .map((file) => `.changeset/${file}`)
        .toSorted()
}

const requirePackageBinary = (
    repoRoot: string,
    binary: string,
    args: ReadonlyArray<string>,
    inherit = false,
): string => {
    const result = runPackageBinary(repoRoot, binary, args, {
        ...(inherit ? { stdio: 'inherit' as const } : {}),
    })
    if (!result.success) {
        throw new Error(
            result.stderr.trim() || result.stdout.trim() || `${binary} failed`,
        )
    }
    return result.stdout.trim()
}

export type ChangesetBranchResult = {
    /** How the branch was attached: newly created, or an existing one switched to. */
    action: 'created' | 'switched'
    branch: string
}

/**
 * Put the caller on the changeset branch — and stop there.
 *
 * Create-or-switch is the whole operation: staging, committing, pushing and opening a pull request are separate
 * explicit steps, so starting a changeset never records work the caller did not ask for. A same-named branch that
 * exists only on the remote cannot be adopted without fetching it, and fetching on the caller's behalf is recovery
 * rather than starting, so that case reports the exact commands instead of guessing.
 */
export const attachChangesetBranch = (
    repoRoot: string,
    options: { branch: string; inherit?: boolean; startPoint: string },
): ChangesetBranchResult => {
    const { branch, inherit = false, startPoint } = options

    if (localBranchExists(repoRoot, branch)) {
        switchBranch(repoRoot, branch, { inherit })
        return { action: 'switched', branch }
    }

    if (
        runCommand(
            'git',
            ['ls-remote', '--exit-code', '--heads', 'origin', branch],
            { cwd: repoRoot },
        ).success
    ) {
        throw new Error(
            [
                `remote branch exists: ${branch}`,
                `Resume it with: git fetch origin ${branch} && git switch ${branch}`,
            ].join('\n'),
        )
    }

    createBranchFromBase(repoRoot, branch, startPoint, { inherit })
    return { action: 'created', branch }
}

export function main(args: Array<string> = process.argv.slice(2)): void {
    const parsed = safeParseArgv(optionsSchema, args)
    if (!parsed.success) {
        throw new Error(`invalid arguments:\n${z.prettifyError(parsed.error)}`)
    }

    const options: Options = parsed.data
    if (options.help === true || options.h === true) {
        console.log(HELP)
        return
    }

    const environment = readWorkspaceEnvironment(process.env)
    const repoRoot = getRepoRoot()
    const log = getLogger()
    const prefix =
        options.prefix?.trim() ||
        environment.prefixOverride.trim() ||
        environment.prefix.trim() ||
        'changeset'
    const allowDirty = options.allowDirty ?? environment.allowDirty
    const baseBranch =
        options.base?.trim() ||
        environment.baseBranch.trim() ||
        detectDefaultBranch(repoRoot) ||
        'main'

    write(
        `${spacer(1)}${line('-', { style: 'cyan', width: '50%' })}${spacer(1)}`,
    )

    const currentBranch = runOrThrow(
        'git',
        ['branch', '--show-current'],
        repoRoot,
    )
    if (!currentBranch) throw new Error('detached HEAD; cannot proceed.')
    if (currentBranch !== baseBranch) {
        throw new Error(`run from ${baseBranch} (git switch ${baseBranch}).`)
    }

    const status = runOrThrow('git', ['status', '--porcelain'], repoRoot)
    if (status) {
        log.error('Working tree is dirty:')
        runCommand('git', ['status', '--short'], {
            cwd: repoRoot,
            stdio: 'inherit',
        })
        if (!allowDirty) {
            throw new Error(
                'commit/stash changes first. Set ALLOW_DIRTY=true to override.',
            )
        }
        log.warn(`ALLOW_DIRTY=${String(allowDirty)}; continuing anyway.`)
        log.warn(`On ${baseBranch} with dirty working tree.`)
    } else {
        log.info(`On ${baseBranch} with clean working tree.`)
    }

    log.info(`...Fetching origin/${baseBranch}...`)
    write(spacer(1))
    runOrThrow('git', ['fetch', 'origin', baseBranch, '--prune'], repoRoot)
    const localBase = runOrThrow('git', ['rev-parse', baseBranch], repoRoot)
    const remoteBase = runOrThrow(
        'git',
        ['rev-parse', `origin/${baseBranch}`],
        repoRoot,
    )
    if (localBase !== remoteBase) {
        throw new Error(
            `${baseBranch} not up to date (run: git pull --ff-only).`,
        )
    }

    const before = new Set(listChangesets(repoRoot))
    write(`${spacer(1)}${section('Launching Changesets CLI...')}${spacer(1)}`)
    requirePackageBinary(repoRoot, 'changeset', ['add'], true)

    const created = listChangesets(repoRoot).filter((file) => !before.has(file))
    if (created.length !== 1) {
        log.info('New changeset files detected:')
        for (const file of created) console.log(file)
        throw new Error(
            fmt`expected exactly 1 new changeset file, found ${created.length}.`,
        )
    }

    const [newFile] = created
    if (!newFile) throw new Error('unable to resolve the new changeset file.')
    const slug = basename(newFile, '.md')
    const branch = `${prefix}/${slug}`
    const scope = requirePackageBinary(repoRoot, 'scope-affected', [
        '--changeset-only',
        newFile,
    ])

    console.log(kvPair('New changeset', newFile))
    console.log(kvPair('Commit scope', scope))
    console.log(kvPair('Proposed branch', branch))

    write(`${kabob('Attaching branch...')}${spacer(1)}`)
    attachChangesetBranch(repoRoot, {
        branch,
        inherit: true,
        startPoint: currentBranch,
    })

    log.info('Done. The changeset file is not staged or committed.')
    console.log(kvPair('Branch', branch))
    console.log(kvPair('Next', `git add ${newFile}`))
    console.log(kvPair('Then', 'gbt-workflow commit'))
    console.log(kvPair('Status', 'gbt-workflow'))
}

export default main

runCliIfEntrypoint(import.meta, main, process.argv.slice(2))
