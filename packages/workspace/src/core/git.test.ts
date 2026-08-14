import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { getGitChangedFiles, getGitChangedFilesByArea } from './git.js'

function makeRepo(): string {
    const root = mkdtempSync(path.join(tmpdir(), 'snail-git-'))
    const git = (...args: Array<string>): void => {
        execFileSync('git', args, { cwd: root, stdio: 'ignore' })
    }

    git('init', '-q')
    git('config', 'user.email', 'test@example.com')
    git('config', 'user.name', 'test')
    writeFileSync(path.join(root, 'tracked.txt'), 'v1\n')
    git('add', 'tracked.txt')
    git('commit', '-qm', 'init')

    return root
}

describe('getGitChangedFilesByArea', () => {
    it('records every area a file appears in', () => {
        const root = makeRepo()
        const git = (...args: Array<string>): void => {
            execFileSync('git', args, { cwd: root, stdio: 'ignore' })
        }

        // Staged, then modified again in the worktree — the case a commit-time report must show,
        // because only the staged half will be committed.
        writeFileSync(path.join(root, 'tracked.txt'), 'v2\n')
        git('add', 'tracked.txt')
        writeFileSync(path.join(root, 'tracked.txt'), 'v3\n')
        writeFileSync(path.join(root, 'new.txt'), 'new\n')

        const byArea = getGitChangedFilesByArea({ cwd: root })
        const tracked = byArea.find((entry) => entry.file === 'tracked.txt')
        const created = byArea.find((entry) => entry.file === 'new.txt')

        expect(tracked?.areas).toEqual(['staged', 'unstaged'])
        expect(created?.areas).toEqual(['untracked'])
    })

    it('honours cwd instead of the process working directory', () => {
        const root = makeRepo()

        writeFileSync(path.join(root, 'only-here.txt'), 'x\n')

        expect(getGitChangedFiles({ cwd: root })).toContain('only-here.txt')
    })

    it('reports a failed git invocation instead of returning nothing', () => {
        const outsideRepo = mkdtempSync(path.join(tmpdir(), 'snail-nogit-'))

        // Silently returning [] here resolved every commit to scope 'root' with no warning.
        expect(() => getGitChangedFiles({ cwd: outsideRepo })).toThrow(/git /u)
    })
})
