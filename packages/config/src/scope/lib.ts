import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

export type CommandResult = {
    status: number
    stderr: string
    stdout: string
}

export type ScopeFormat = 'csv' | 'list'

export function findNearestPackageJson(
    repoRoot: string,
    inputPath: string,
): null | string {
    const relativePath = normalizeRepoPath(repoRoot, inputPath)
    const absolutePath = path.resolve(repoRoot, relativePath)

    let searchDir = pathExistsAsDirectory(absolutePath)
        ? absolutePath
        : path.dirname(absolutePath)

    while (searchDir.startsWith(repoRoot)) {
        const candidate = path.join(searchDir, 'package.json')

        if (existsSync(candidate)) return candidate

        if (searchDir === repoRoot) break

        searchDir = path.dirname(searchDir)
    }

    return null
}

export function formatScopes(
    scopes: ReadonlyArray<string>,
    format: ScopeFormat,
): string {
    const values = scopes.length > 0 ? scopes : ['root']

    if (format === 'list') return values.join('\n')

    // Keep commas tight so commitlint multi-scope parsing does not include
    // leading spaces in later scope values.
    return values.join(',')
}

export function getRepoRoot(): string {
    const result = runCommand('git', ['rev-parse', '--show-toplevel'])

    if (result.status === 0 && result.stdout.trim()) {
        return result.stdout.trim()
    }

    return process.cwd()
}

export function isRootPackageName(packageName: string): boolean {
    return packageName === 'root' || /^@[^/]+\/root$/.test(packageName)
}

export function normalizeRepoPath(repoRoot: string, inputPath: string): string {
    const cleanPath = inputPath.replace(/^\.\//, '')

    if (path.isAbsolute(cleanPath)) {
        return path.relative(repoRoot, cleanPath)
    }

    return cleanPath
}

export function readPackageName(packageJsonPath: string): null | string {
    if (!existsSync(packageJsonPath)) return null

    try {
        const raw = readFileSync(packageJsonPath, 'utf8')
        const parsed = JSON.parse(raw) as { name?: unknown }

        return typeof parsed.name === 'string' && parsed.name.trim()
            ? parsed.name.trim()
            : null
    } catch {
        return null
    }
}

export function runCommand(
    command: string,
    args: ReadonlyArray<string>,
    options: { cwd?: string; input?: string; stdio?: 'inherit' | 'pipe' } = {},
): CommandResult {
    const result = spawnSync(command, args, {
        cwd: options.cwd,
        encoding: 'utf8',
        input: options.input,
        shell: false,
        stdio: options.stdio ?? 'pipe',
    })

    return {
        status: result.status ?? 1,
        stderr: result.stderr ?? '',
        stdout: result.stdout ?? '',
    }
}

export function shortenScopeName(
    scopeName: string,
    keepPrefix = false,
): string {
    if (keepPrefix) return scopeName

    if (!scopeName.startsWith('@')) return scopeName

    const slashIndex = scopeName.indexOf('/')

    if (slashIndex === -1) return scopeName

    return scopeName.slice(slashIndex + 1)
}

export function splitLines(value: string): Array<string> {
    return value
        .replaceAll('\r', '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
}

export function uniqueSorted(values: ReadonlyArray<string>): Array<string> {
    return [...new Set(values.filter(Boolean))].toSorted()
}

function pathExistsAsDirectory(filePath: string): boolean {
    try {
        return existsSync(filePath) && statSync(filePath).isDirectory()
    } catch {
        return false
    }
}
