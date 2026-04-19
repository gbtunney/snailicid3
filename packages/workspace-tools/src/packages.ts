import { execCommand, getExecCommandOutput } from './exec.js'

export type WorkspacePackage = {
    name: string
    path: string
    version: string
    private: boolean
}

export function getWorkspacePackagesList(
    filter?: (pkg: WorkspacePackage) => boolean,
): Array<WorkspacePackage> {
    const out = getExecCommandOutput('pnpm list -r --depth -1 --json')
    if (!out.success) return []
    const pkgList = JSON.parse(out.result) as Array<WorkspacePackage>
    return filter ? pkgList.filter(filter) : pkgList
}

export function workspacePackagesToArray(
    input:
        | ReadonlyMap<string, WorkspacePackage>
        | Record<string, WorkspacePackage>,
): Array<WorkspacePackage> {
    if (input instanceof Map)
        return Array.from<WorkspacePackage>(input.values())
    return Object.values<WorkspacePackage>(
        input as Record<string, WorkspacePackage>,
    )
}

export function getWorkspacePackagesLookup(
    ...args: Parameters<typeof getWorkspacePackagesList>
): Map<string, WorkspacePackage> {
    return new Map(Object.entries(getWorkspacePackagesObject(...args)))
}

export function getWorkspacePackagesObject(
    filter?: (pkg: WorkspacePackage) => boolean,
): Record<string, WorkspacePackage>
export function getWorkspacePackagesObject<R>(
    filter: ((pkg: WorkspacePackage) => boolean) | undefined,
    mapValue: (pkg: WorkspacePackage, name: string, index: number) => R,
): Record<string, R>
export function getWorkspacePackagesObject<R>(
    filter?: (pkg: WorkspacePackage) => boolean,
    mapValue?: (pkg: WorkspacePackage, name: string, index: number) => R,
) {
    const pkgs = getWorkspacePackagesList(filter)
    if (!mapValue) {
        return Object.fromEntries(pkgs.map((pkg) => [pkg.name, pkg])) as Record<
            string,
            WorkspacePackage
        >
    }
    return Object.fromEntries(
        pkgs.map((pkg, i) => [pkg.name, mapValue(pkg, pkg.name, i)]),
    ) as Record<string, R>
}

export function getWorkspaceRoot(): string {
    return execCommand('pnpm root -w') ?? ''
}

type KeyMode = 'include' | 'exclude'

export function setPackageKeys<Key extends keyof WorkspacePackage>(
    pkg: WorkspacePackage,
    mode: 'include',
    keys: ReadonlyArray<Key>,
): Pick<WorkspacePackage, Key>
export function setPackageKeys<Key extends keyof WorkspacePackage>(
    pkg: WorkspacePackage,
    mode: 'exclude',
    keys: ReadonlyArray<Key>,
): Omit<WorkspacePackage, Key>
export function setPackageKeys<Key extends keyof WorkspacePackage>(
    pkg: WorkspacePackage,
    mode: KeyMode,
    keys: ReadonlyArray<Key>,
) {
    if (mode === 'include') {
        return Object.fromEntries(keys.map((key) => [key, pkg[key]])) as Pick<
            WorkspacePackage,
            Key
        >
    }
    return Object.fromEntries(
        (Object.keys(pkg) as Array<keyof WorkspacePackage>)
            .filter(
                (key) =>
                    !(keys as ReadonlyArray<keyof WorkspacePackage>).includes(
                        key,
                    ),
            )
            .map((key) => [key, pkg[key]]),
    ) as Omit<WorkspacePackage, Key>
}
