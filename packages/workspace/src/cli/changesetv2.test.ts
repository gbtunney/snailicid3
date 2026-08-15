import { safeParseArgv } from '@snailicid3/node-utils'
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { attachChangesetBranch, optionsSchema } from './changesetv2.js'

describe('changeset CLI argument schema', () => {
    it('parses the supported options through the shared argv parser', () => {
        expect(
            safeParseArgv(optionsSchema, [
                '--allow-dirty',
                '--base',
                'trunk',
                '--prefix',
                'changeset',
            ]),
        ).toEqual({
            data: {
                allowDirty: true,
                base: 'trunk',
                prefix: 'changeset',
            },
            success: true,
        })
    })

    it('rejects unknown options', () => {
        expect(
            safeParseArgv(optionsSchema, ['--not-a-real-option']),
        ).toMatchObject({ success: false })
    })
})

const makeRepo = (): {
    git: (...args: Array<string>) => void
    root: string
} => {
    const root = mkdtempSync(path.join(tmpdir(), 'snail-changeset-'))
    const git = (...args: Array<string>): void => {
        execFileSync('git', args, { cwd: root, stdio: 'ignore' })
    }

    git('init', '-q', '-b', 'main')
    git('config', 'user.email', 'test@example.com')
    git('config', 'user.name', 'test')
    writeFileSync(path.join(root, 'tracked.txt'), 'v1\n')
    git('add', 'tracked.txt')
    git('commit', '-qm', 'init')

    return { git, root }
}

const status = (root: string): string =>
    execFileSync('git', ['status', '--porcelain'], {
        cwd: root,
        encoding: 'utf8',
    })

const commitCount = (root: string): string =>
    execFileSync('git', ['rev-list', '--count', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
    }).trim()

describe('attachChangesetBranch', () => {
    it('creates the branch and leaves the changeset file uncommitted', () => {
        const { root } = makeRepo()

        writeFileSync(path.join(root, 'wacky-walker.md'), '---\n---\n')
        const before = commitCount(root)

        expect(
            attachChangesetBranch(root, {
                branch: 'changeset/wacky-walker',
                startPoint: 'main',
            }),
        ).toEqual({ action: 'created', branch: 'changeset/wacky-walker' })

        expect(
            execFileSync('git', ['branch', '--show-current'], {
                cwd: root,
                encoding: 'utf8',
            }).trim(),
        ).toBe('changeset/wacky-walker')
        // The whole point of the slice: nothing was staged, nothing was committed.
        expect(status(root)).toBe('?? wacky-walker.md\n')
        expect(commitCount(root)).toBe(before)
    })

    it('switches to the branch when it already exists locally', () => {
        const { git, root } = makeRepo()

        git('branch', 'changeset/wacky-walker')

        expect(
            attachChangesetBranch(root, {
                branch: 'changeset/wacky-walker',
                startPoint: 'main',
            }),
        ).toEqual({ action: 'switched', branch: 'changeset/wacky-walker' })
    })
})
