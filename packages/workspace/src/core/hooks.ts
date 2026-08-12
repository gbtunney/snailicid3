import { runCommand } from '@snailicid3/node-utils'

import { readWorkspaceEnvironment } from './environment.js'
import { getCurrentBranch } from './git.js'
import { runPackageBinary, runPackageScript } from './package-manager.js'

export function checkProtectedBranch(
    repoRoot: string,
    operation: 'commit' | 'push',
    environment: NodeJS.ProcessEnv = process.env,
): void {
    const branch = getCurrentBranch(repoRoot)
    const { protectedBranches } = readWorkspaceEnvironment(environment)

    if (protectedBranches.includes(branch)) {
        throw new Error(
            `Direct ${operation} on protected branch '${branch}' is not allowed.`,
        )
    }
}

export function checkStagedFilenames(repoRoot: string): void {
    const result = runCommand('git', ['diff', '--cached', '--name-only'], {
        cwd: repoRoot,
    })

    if (!result.success) throw new Error(result.stderr || 'git diff failed')

    const invalid = result.stdout
        .split('\n')
        .filter(Boolean)
        .filter((file) => /[^A-Za-z0-9._/@ +-]/u.test(file))

    if (invalid.length > 0) {
        throw new Error(
            `Bad characters found in staged filenames:\n${invalid.join('\n')}`,
        )
    }
}

export function runCommitMessageHook(
    repoRoot: string,
    messageFile: string,
): void {
    const result = runPackageBinary(
        repoRoot,
        'commitlint',
        ['--edit', messageFile],
        { stdio: 'inherit' },
    )

    if (!result.success) throw new Error('commitlint failed')
}

export function runLintStaged(
    repoRoot: string,
    environment: NodeJS.ProcessEnv = process.env,
): void {
    if (readWorkspaceEnvironment(environment).skipLintStaged) {
        console.log('lint-staged skipped (SKIP_LINT_STAGED=true).')
        return
    }

    const result = runPackageScript(repoRoot, 'lint:staged', [], {
        stdio: 'inherit',
    })

    if (!result.success) throw new Error('lint-staged failed')
}

export function runSnailSh(
    repoRoot: string,
    command: string,
    args: ReadonlyArray<string> = [],
): void {
    const result = runPackageBinary(repoRoot, 'snail-sh', [command, ...args], {
        stdio: 'inherit',
    })

    if (!result.success) throw new Error(`snail-sh ${command} failed`)
}

export function showHookSection(repoRoot: string, hookName: string): void {
    runSnailSh(repoRoot, 'spacer', ['1'])
    runSnailSh(repoRoot, 'kabob', [
        `🐌 Running: ${hookName} ...`,
        '90%',
        'magenta',
        'true',
    ])
    runSnailSh(repoRoot, 'spacer', ['1'])
}

export function validateBranchName(repoRoot: string): void {
    const branch = getCurrentBranch(repoRoot)

    if (!/^[a-zA-Z0-9]+(?:[/-][a-zA-Z0-9]+)*$/u.test(branch)) {
        throw new Error(
            `Branch name must be alphanumeric and may contain '/' or '-': ${branch}`,
        )
    }
}
