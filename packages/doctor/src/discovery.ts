import { getWorkspacePackagesList } from '@snailicid3/workspace'
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

export type DiscoveryOptions = Readonly<{
    usePackageManager?: boolean
}>

const SKIPPED_DIRECTORIES = new Set([
    '.changeset',
    '.git',
    '.nx',
    'coverage',
    'dist',
    'docs',
    'node_modules',
    'releases',
    'storybook-static',
    'temp',
    'tmp',
    'types',
])

/**
 * Discover package roots through the workspace package engine, with a bounded filesystem fallback. The fallback keeps
 * Doctor useful when the selected package manager is unavailable or incompatible.
 */
export function discoverPackageRoots(
    inputPath: string = process.cwd(),
    options: DiscoveryOptions = {},
): ReadonlyArray<string> {
    const root = resolveInputRoot(inputPath)
    const { usePackageManager = true } = options

    if (usePackageManager && existsSync(path.join(root, 'package.json'))) {
        try {
            const workspacePackages = getWorkspacePackagesList(undefined, root)
            const packageRoots = workspacePackages
                .map((workspacePackage) => path.resolve(workspacePackage.path))
                .filter((packageRoot) =>
                    existsSync(path.join(packageRoot, 'package.json')),
                )

            if (packageRoots.length > 0) return uniqueSorted(packageRoots)
        } catch {
            // Report from observed manifests even if package-manager discovery is unavailable.
        }
    }

    const packageRoots = discoverPackageRootsFromFilesystem(root)

    if (packageRoots.length === 0) {
        throw new Error(`No package.json files found at or below ${root}`)
    }

    return packageRoots
}

/** Discover manifests without requiring Nx or a functioning package-manager command. */
export function discoverPackageRootsFromFilesystem(
    inputRoot: string,
): ReadonlyArray<string> {
    const root = path.resolve(inputRoot)
    const packageRoots: Array<string> = []

    visitDirectory(root, packageRoots, 0)
    return uniqueSorted(packageRoots)
}

function resolveInputRoot(inputPath: string): string {
    const absolutePath = path.resolve(inputPath)

    if (!existsSync(absolutePath)) {
        throw new Error(`Doctor input path does not exist: ${absolutePath}`)
    }

    return statSync(absolutePath).isDirectory()
        ? absolutePath
        : path.dirname(absolutePath)
}

function uniqueSorted(values: ReadonlyArray<string>): ReadonlyArray<string> {
    return [...new Set(values)].toSorted((left, right) =>
        left.localeCompare(right),
    )
}

function visitDirectory(
    directory: string,
    packageRoots: Array<string>,
    depth: number,
): void {
    if (depth > 12) return

    if (existsSync(path.join(directory, 'package.json'))) {
        packageRoots.push(directory)
    }

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.isSymbolicLink()) continue
        if (SKIPPED_DIRECTORIES.has(entry.name)) continue
        if (entry.name.startsWith('.') && entry.name !== '.config') continue

        visitDirectory(
            path.join(directory, entry.name),
            packageRoots,
            depth + 1,
        )
    }
}
