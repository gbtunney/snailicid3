import { runCommand } from '@snailicid3/node-utils'
import { readWorkspaceEnvironment } from './environment.js'
import { runPackageBinary } from './package-manager.js'

/**
 * The two mutating steps every commit path shares: validate the message, then record the commit.
 *
 * Extracted from `scope-commit` so the branch-derived commit runs the identical Commitlint gate rather than a second
 * approximation of it. Both are deliberately explicit — nothing here is invoked as a side effect of planning.
 */

/** Run `git commit` with the given message, streaming git's output to the terminal. */
export const performCommit = (repoRoot: string, message: string): void => {
    const result = runCommand('git', ['commit', '-m', message], {
        cwd: repoRoot,
        stdio: 'inherit',
    })

    if (result.status !== 0) throw new Error('git commit failed')

    process.stdout.write(result.stdout)
}

/** Throw when nothing is staged, so a commit never silently records an empty change. */
export const requireStagedChanges = (repoRoot: string): void => {
    const stagedDiff = runCommand('git', ['diff', '--cached', '--quiet'], {
        cwd: repoRoot,
    })

    if (stagedDiff.status === 0) {
        throw new Error(
            'Nothing is staged. Stage the files you want to commit first.',
        )
    }

    if (stagedDiff.status !== 1) {
        throw new Error(stagedDiff.stderr || 'Unable to inspect staged files')
    }
}

/** Validate a commit message with the repository's Commitlint configuration. */
export const validateCommitMessage = (
    repoRoot: string,
    message: string,
): void => {
    if (readWorkspaceEnvironment(process.env).skipCommitlint) return

    const result = runPackageBinary(
        repoRoot,
        'commitlint',
        ['--cwd', repoRoot],
        {
            cwd: repoRoot,
            input: `${message}\n`,
        },
    )

    if (result.status !== 0) {
        throw new Error(
            [
                'invalid commit message:',
                `  ${message}`,
                result.stderr.trim(),
                result.stdout.trim(),
            ]
                .filter(Boolean)
                .join('\n'),
        )
    }
}
