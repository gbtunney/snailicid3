import { spawnSync } from 'node:child_process'

export type CommandResult = {
    status: number
    stderr: string
    stdout: string
    success: boolean
}

export function runCommand(
    command: string,
    args: ReadonlyArray<string> = [],
    options: { cwd?: string; input?: string } = {},
): CommandResult {
    const result = spawnSync(command, args, {
        cwd: options.cwd,
        encoding: 'utf8',
        input: options.input,
        shell: false,
    })

    const status = result.status ?? 1

    return {
        status,
        stderr: result.stderr,
        stdout: result.stdout,
        success: status === 0,
    }
}

export function runCommandOrThrow(
    command: string,
    args: ReadonlyArray<string> = [],
    options: { cwd?: string; input?: string } = {},
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
