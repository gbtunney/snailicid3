import { describe, expect, test } from 'vitest'
import { type CommandResult } from './../utilities/command.js'
import { runCommand } from './../utilities/command.js'
import { getRepoRoot } from './../workspace/git.js'

const repoRoot = getRepoRoot()

function runCommitlintFromStdin(commitMessage: string): CommandResult {
    return runCommand('pnpm', ['exec', 'commitlint'], {
        cwd: repoRoot,
        input: `${commitMessage}\n`,
    })
}

describe('commitlint CLI integration', () => {
    test('accepts a valid commit message', () => {
        const result = runCommitlintFromStdin(
            'feat(root): test direct commitlint',
        )
        expect(result.status).toBe(0)
    }, 15000)

    test('rejects an invalid type', () => {
        const result = runCommitlintFromStdin('ci(root): should fail')
        expect(result.status).not.toBe(0)
    }, 15000)

    test('rejects an invalid scope', () => {
        const result = runCommitlintFromStdin(
            'feat(some-random-package): should fail scope',
        )
        expect(result.status).not.toBe(0)
    }, 15000)
})
