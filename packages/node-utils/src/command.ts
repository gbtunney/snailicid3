import { spawnSync } from 'node:child_process'

export type CommandResult = {
    status: number
    stderr: string
    stdout: string
    success: boolean
}

export type RunCommandOptions = {
    cwd?: string
    input?: string
    stdio?: 'inherit' | 'pipe'
}

/** Run a command synchronously without a shell and return normalized output and status. */
export function runCommand(
    command: string,
    args: ReadonlyArray<string> = [],
    options: RunCommandOptions = {},
): CommandResult {
    const result = spawnSync(command, args, {
        cwd: options.cwd,
        encoding: 'utf8',
        input: options.input,
        shell: false,
        stdio: options.stdio ?? 'pipe',
    })

    const status = result.status ?? 1
    const stderr: unknown = result.stderr
    const stdout: unknown = result.stdout

    return {
        status,
        stderr: typeof stderr === 'string' ? stderr : '',
        stdout: typeof stdout === 'string' ? stdout : '',
        success: status === 0,
    }
}

/** Run a command synchronously and return trimmed stdout, throwing on failure. */
export function runCommandOrThrow(
    command: string,
    args: ReadonlyArray<string> = [],
    options: RunCommandOptions = {},
): string {
    const result = runCommand(command, args, options)

    if (!result.success) {
        throw new Error(
            [
                `Command failed: ${command} ${args.join(' ')}`,
                result.stderr.trim(),
                result.stdout.trim(),
            ]
                .filter(Boolean)
                .join('\n'),
        )
    }

    return result.stdout.trim()
}
