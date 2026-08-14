import {
    jsonTextSchema,
    packageNameSchema,
    packageVersionSchema,
    readPackageManifest,
} from '@snailicid3/node-utils'
import { z } from 'zod'
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { getRepoRoot } from './git.js'
import { getPackageManager, runPackageManager } from './package-manager.js'
import { normalizeRepoPath, safeNormalizeRepoPath } from './paths.js'

export type WorkspacePackage = {
    name: string
    path: string
    private?: boolean
    version: string
}
/**
 * One record from a package manager's workspace listing.
 *
 * pnpm reports an absolute `path`; npm reports a `location` relative to the repository root. Both are normalized to a
 * repository-relative POSIX path so classifier input is consistent, and a record pointing outside the repository is an
 * error rather than something to quietly drop.
 */
export const workspacePackageRecordSchema = (
    repoRoot: string,
): z.ZodType<WorkspacePackage> =>
    z
        .looseObject({
            location: z.string().optional(),
            name: packageNameSchema,
            path: z.string().optional(),
            private: z.boolean().optional(),
            version: packageVersionSchema,
        })
        .transform((record, context) => {
            const rawPath = record.path ?? record.location

            if (rawPath === undefined) {
                context.addIssue({
                    code: 'custom',
                    message: `Package ${record.name} has neither a path nor a location`,
                })
                return z.NEVER
            }

            const normalized = safeNormalizeRepoPath(repoRoot, rawPath)

            if (normalized === null) {
                context.addIssue({
                    code: 'custom',
                    message: `Package ${record.name} resolves outside the repository: ${rawPath}`,
                })
                return z.NEVER
            }

            return {
                name: record.name,
                path: normalized,
                version: record.version,
                ...(record.private === undefined
                    ? {}
                    : { private: record.private }),
            } satisfies WorkspacePackage
        })

/** A package manager's complete `--json` workspace listing. */
export const workspacePackageManagerOutputSchema = (
    repoRoot: string,
): z.ZodType<Array<WorkspacePackage>, string> =>
    jsonTextSchema.pipe(z.array(workspacePackageRecordSchema(repoRoot)))

/** Workspace packages parsed once, with both access shapes derived from the same parse. */
export type WorkspaceSnapshot = {
    list: Array<WorkspacePackage>
    lookup: Map<string, WorkspacePackage>
    repoRoot: string
}

export type WorkspaceSnapshotResult =
    | { data: WorkspaceSnapshot; success: true }
    | { error: string; success: false }

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

/** Read the active package manager's workspace listing and optionally filter it. */
export function getWorkspacePackagesList(
    filter?: (pkg: WorkspacePackage) => boolean,
    repoRoot: string = getRepoRoot({ fallbackToCwd: true }),
): Array<WorkspacePackage> {
    const { list } = getWorkspaceSnapshot(repoRoot)

    // Filtering happens only after a successful parse, so a rejected record can never be mistaken
    // for one the filter excluded.
    return filter ? list.filter(filter) : list
}

/**
 * Discover workspace packages, throwing on command or schema failure.
 *
 * Returning an empty list for a failed command or a malformed record made a broken workspace indistinguishable from an
 * empty one, and silently dropping invalid records could yield a partial package list that later stages treated as
 * complete.
 */
export function getWorkspaceSnapshot(
    repoRoot: string = getRepoRoot({ fallbackToCwd: true }),
): WorkspaceSnapshot {
    const result = safeGetWorkspaceSnapshot(repoRoot)

    if (!result.success) {
        throw new Error(`Unable to read workspace packages:\n${result.error}`)
    }

    return result.data
}
/** Read a trimmed package name from a manifest, returning null for missing or invalid data. */
export function readPackageName(packageJsonPath: string): null | string {
    const manifest = readPackageManifest(packageJsonPath)

    return manifest.success ? (manifest.data.name ?? null) : null
}

/**
 * Discover workspace packages without throwing.
 *
 * Exists for diagnostic callers that must report a broken workspace rather than inherit an empty one.
 * `getWorkspaceSnapshot` is the canonical entry point and fails loudly.
 */
export function safeGetWorkspaceSnapshot(
    repoRoot: string = getRepoRoot({ fallbackToCwd: true }),
): WorkspaceSnapshotResult {
    const packageManager = getPackageManager(repoRoot)
    const args =
        packageManager === 'pnpm'
            ? ['list', '-r', '--depth', '-1', '--json']
            : ['query', '.workspace', '--json']
    const output = runPackageManager(repoRoot, args)

    if (!output.success) {
        return {
            error: [
                `${packageManager} ${args.join(' ')} failed in ${repoRoot}.`,
                output.stderr.trim(),
            ]
                .filter(Boolean)
                .join('\n'),
            success: false,
        }
    }

    const parsed = workspacePackageManagerOutputSchema(repoRoot).safeParse(
        output.stdout,
    )

    if (!parsed.success) {
        return { error: z.prettifyError(parsed.error), success: false }
    }

    const list = parsed.data

    return {
        data: {
            list,
            lookup: new Map(list.map((pkg) => [pkg.name, pkg])),
            repoRoot,
        },
        success: true,
    }
}

/** Normalize npm and pnpm workspace records to the shared package shape. */

/** Safely determine whether a path exists and is a directory. */
function pathExistsAsDirectory(filePath: string): boolean {
    try {
        return existsSync(filePath) && statSync(filePath).isDirectory()
    } catch {
        return false
    }
}
