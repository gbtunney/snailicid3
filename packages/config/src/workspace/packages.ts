import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { normalizeRepoPath } from './paths.js'
import { runCommand } from '../utilities/command.js'

export type WorkspacePackage = {
    name: string
    path: string
    private?: boolean
    version: string
}
export const validPackageName =
    /^(@[\da-z~-][\d._a-z~-]*\/)?[\da-z~-][\d._a-z~-]*$/

/** Find the closest package manifest at or above an input path without leaving the repository. */
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

/** Ask pnpm for the workspace node_modules directory, returning undefined when pnpm fails. */
export function getWorkspaceNodeModulesRoot(): string | undefined {
    const output = runCommand('pnpm', ['root', '-w'])

    return output.success ? output.stdout.trim() : undefined
}

/** Read pnpm's recursive workspace package listing and optionally filter it. */
export function getWorkspacePackagesList(
    filter?: (pkg: WorkspacePackage) => boolean,
): Array<WorkspacePackage> {
    const output = runCommand('pnpm', ['list', '-r', '--depth', '-1', '--json'])

    if (!output.success) return []

    const parsedPackages: unknown = JSON.parse(output.stdout)
    const packages = Array.isArray(parsedPackages)
        ? parsedPackages.filter(isWorkspacePackage)
        : []

    return filter ? packages.filter(filter) : packages
}

/** Index workspace packages by package name in a Map. */
export function getWorkspacePackagesLookup(
    ...args: Parameters<typeof getWorkspacePackagesList>
): Map<string, WorkspacePackage> {
    return new Map(Object.entries(getWorkspacePackagesObject(...args)))
}

/** Index workspace packages by name, optionally mapping each package to another value. */
export function getWorkspacePackagesObject(
    filter?: (pkg: WorkspacePackage) => boolean,
): Record<string, WorkspacePackage>
export function getWorkspacePackagesObject<Result>(
    filter: ((pkg: WorkspacePackage) => boolean) | undefined,
    mapValue: (pkg: WorkspacePackage, name: string, index: number) => Result,
): Record<string, Result>
export function getWorkspacePackagesObject<Result>(
    filter?: (pkg: WorkspacePackage) => boolean,
    mapValue?: (pkg: WorkspacePackage, name: string, index: number) => Result,
): Record<string, Result> | Record<string, WorkspacePackage> {
    const packages = getWorkspacePackagesList(filter)

    if (!mapValue) {
        return Object.fromEntries(
            packages.map((pkg) => [pkg.name, pkg] as const),
        )
    }

    return Object.fromEntries(
        packages.map((pkg, index) => [
            pkg.name,
            mapValue(pkg, pkg.name, index),
        ]),
    )
}

/** Read a trimmed package name from a manifest, returning null for missing or invalid data. */
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

/** Convert either supported workspace package collection into an array. */
export function workspacePackagesToArray(
    input:
        | ReadonlyMap<string, WorkspacePackage>
        | Record<string, WorkspacePackage>,
): Array<WorkspacePackage> {
    if (input instanceof Map) {
        return Array.from(input.values())
    }

    return Object.values(input)
}

/** Check whether unknown pnpm output has the fields required for a workspace package. */
function isWorkspacePackage(value: unknown): value is WorkspacePackage {
    if (!value || typeof value !== 'object') return false

    const candidate = value as Partial<WorkspacePackage>

    return (
        typeof candidate.name === 'string' &&
        typeof candidate.path === 'string' &&
        typeof candidate.version === 'string' &&
        (candidate.private === undefined ||
            typeof candidate.private === 'boolean')
    )
}

/** Safely determine whether a path exists and is a directory. */
function pathExistsAsDirectory(filePath: string): boolean {
    try {
        return existsSync(filePath) && statSync(filePath).isDirectory()
    } catch {
        return false
    }
}
