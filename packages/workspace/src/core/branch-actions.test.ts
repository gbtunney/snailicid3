import { runCommand } from '@snailicid3/node-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { executeBranchAction } from './branch-actions.js'
import { type BranchDecision, type BranchState } from './branch-state.js'

const git = (repoRoot: string, args: Array<string>): void => {
    const result = runCommand('git', args, { cwd: repoRoot })
    if (!result.success)
        throw new Error(`git ${args.join(' ')}: ${result.stderr}`)
}

const currentBranch = (repoRoot: string): string =>
    runCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: repoRoot,
    }).stdout.trim()

const makeRepo = (): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'snail-branch-actions-'))
    git(dir, ['init', '--initial-branch=main'])
    git(dir, ['config', 'user.email', 'test@example.com'])
    git(dir, ['config', 'user.name', 'Test'])
    fs.writeFileSync(path.join(dir, 'README.md'), '# test\n')
    git(dir, ['add', '.'])
    git(dir, ['commit', '-m', 'chore(root): init'])
    return dir
}

const state = (overrides: Partial<BranchState> = {}): BranchState => ({
    baseBranch: 'main',
    baseSync: 'in-sync',
    currentBranch: 'main',
    currentKind: 'base',
    onTarget: false,
    targetBranch: 'changeset/wacky-walker',
    targetExistsLocal: false,
    targetExistsRemote: false,
    workingTree: 'clean',
    ...overrides,
})

const decision = (overrides: Partial<BranchDecision> = {}): BranchDecision => ({
    action: 'create',
    carriesDirtyChanges: false,
    offerUpdateWithBase: false,
    reason: 'test',
    targetBranch: 'changeset/wacky-walker',
    warnings: [],
    ...overrides,
})

describe('executeBranchAction (temp git repo)', () => {
    let repo: string

    beforeEach(() => {
        repo = makeRepo()
    })

    afterEach(() => {
        fs.rmSync(repo, { force: true, recursive: true })
    })

    it('creates the target branch from base', () => {
        executeBranchAction(repo, decision({ action: 'create' }), state())
        expect(currentBranch(repo)).toBe('changeset/wacky-walker')
    })

    it('switches (relinks) to an existing target branch', () => {
        git(repo, ['branch', 'changeset/wacky-walker'])
        executeBranchAction(repo, decision({ action: 'switch' }), state())
        expect(currentBranch(repo)).toBe('changeset/wacky-walker')
    })

    it('carries uncommitted changes onto the created branch', () => {
        fs.writeFileSync(path.join(repo, 'dirty.txt'), 'wip\n')
        executeBranchAction(
            repo,
            decision({ action: 'create', carriesDirtyChanges: true }),
            state({ workingTree: 'dirty' }),
        )
        expect(currentBranch(repo)).toBe('changeset/wacky-walker')
        // The uncommitted file survived the branch creation
        expect(fs.existsSync(path.join(repo, 'dirty.txt'))).toBe(true)
    })

    it('is a no-op when proceeding (already on target)', () => {
        git(repo, ['switch', '--create', 'changeset/wacky-walker'])
        executeBranchAction(repo, decision({ action: 'proceed' }), state())
        expect(currentBranch(repo)).toBe('changeset/wacky-walker')
    })

    it('throws on a block', () => {
        expect(() => {
            executeBranchAction(
                repo,
                decision({ action: 'block', reason: 'detached HEAD' }),
                state(),
            )
        }).toThrow('detached HEAD')
        // Still on the original branch
        expect(currentBranch(repo)).toBe('main')
    })
})
