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
import { readWorkspaceEnvironment } from './../core/environment.js'
import { getRepoRoot } from './../core/git.js'
import { runPackageBinary } from './../core/package-manager.js'

export const optionsSchema = z.strictObject({
    allowDirty: z.boolean().optional(),
    base: z.string().optional(),
    prefix: z.string().optional(),
})

type Options = z.output<typeof optionsSchema>

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

const detectDefaultBranch = (repoRoot: string): string => {
    const result = runCommand(
        'git',
        ['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'],
        { cwd: repoRoot },
    )
    return result.success ? result.stdout.trim().replace(/^origin\//u, '') : ''
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

export function main(args: Array<string> = process.argv.slice(2)): void {
    const parsed = safeParseArgv(optionsSchema, args)
    if (!parsed.success) {
        throw new Error(`invalid arguments:\n${z.prettifyError(parsed.error)}`)
    }

    const options: Options = parsed.data
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

    if (
        runCommand(
            'git',
            ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`],
            { cwd: repoRoot },
        ).success
    ) {
        throw new Error(`local branch exists: ${branch}`)
    }
    if (
        runCommand(
            'git',
            ['ls-remote', '--exit-code', '--heads', 'origin', branch],
            {
                cwd: repoRoot,
            },
        ).success
    ) {
        throw new Error(`remote branch exists: ${branch}`)
    }

    write(`${kabob('Creating branch...')}${spacer(1)}`)
    runOrThrow('git', ['switch', '-c', branch], repoRoot)
    log.info('Committing changeset...')

    write(spacer(1))
    runOrThrow('git', ['add', newFile], repoRoot)
    requirePackageBinary(
        repoRoot,
        'scope-commit',
        ['--checked-commit', 'changeset', slug, '--scope', scope],
        true,
    )

    log.info('Done.')
    console.log(kvPair('Branch', branch))
    console.log(kvPair('Next', `git push -u origin ${branch}`))
}

export default main

runCliIfEntrypoint(import.meta, main, process.argv.slice(2))
