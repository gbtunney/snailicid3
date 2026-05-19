import { runCommand } from '../utilities/command.js'

export type WorkspacePackage = {
    name: string
    path: string
    private?: boolean
    version: string
}

export function getWorkspaceNodeModulesRoot(): string | undefined {
    const output = runCommand('pnpm', ['root', '-w'])

    return output.success ? output.stdout.trim() : undefined
}

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

export function getWorkspacePackagesLookup(
    ...args: Parameters<typeof getWorkspacePackagesList>
): Map<string, WorkspacePackage> {
    return new Map(Object.entries(getWorkspacePackagesObject(...args)))
}

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
