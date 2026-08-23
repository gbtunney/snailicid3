import lint from '@commitlint/lint'
import load from '@commitlint/load'
import type { LintOptions, LintOutcome } from '@commitlint/types'
import { runCommand } from '@snailicid3/node-utils'
import { readWorkspaceEnvironment } from './environment.js'

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

/** Lint a commit message against the repository's Commitlint configuration, in-process. */
export const lintCommitMessage = async (
    repoRoot: string,
    message: string,
): Promise<LintOutcome> => {
    const config = await load({}, { cwd: repoRoot })

    return lint(message, config.rules, {
        defaultIgnores: config.defaultIgnores,
        ignores: config.ignores,
        parserOpts: config.parserPreset
            ?.parserOpts as LintOptions['parserOpts'],
        plugins: config.plugins,
    })
}

/** Validate a commit message with the repository's Commitlint configuration. */
export const validateCommitMessage = async (
    repoRoot: string,
    message: string,
): Promise<void> => {
    if (readWorkspaceEnvironment(process.env).skipCommitlint) return

    const outcome = await lintCommitMessage(repoRoot, message)

    if (!outcome.valid) {
        const problems = [...outcome.errors, ...outcome.warnings].map(
            (rule) => `  ${rule.name} ${rule.message}`,
        )

        throw new Error(
            ['invalid commit message:', `  ${message}`, ...problems].join('\n'),
        )
    }
}
