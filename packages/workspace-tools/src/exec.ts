import { execSync } from 'node:child_process'

type ExecResult = {
    success: boolean
    result: string
}

export function execCommand(
    command: string,
    trim = true,
    encoding: BufferEncoding = 'utf8',
): string {
    const out = execSync(command, { encoding }).toString()
    return trim ? out.trim() : out
}

export function getExecCommandOutput(command: string): ExecResult {
    try {
        return { result: execCommand(command), success: true }
    } catch (err: unknown) {
        const message =
            err instanceof Error
                ? ((err as NodeJS.ErrnoException & { stderr?: string })
                      .stderr ?? err.message)
                : String(err)
        return { result: message, success: false }
    }
}

export function quoteShellArgument(value: string): string {
    return `'${value.replace(/'/g, "'\"'\"'")}'`
}
