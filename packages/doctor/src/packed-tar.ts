import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'

/**
 * The one tar pipeline every packed-artifact collector shares.
 *
 * Listing, safety checks, extraction and artifact-root resolution live here so dependency closure, Publint and ATTW all
 * inspect an archive that was opened exactly once, by exactly one set of rules. A second extractor would be a second
 * place for a path-traversal or link check to drift.
 */
export type CommandOutcome =
    | Readonly<{ detail: string; stdout: string; success: false }>
    | Readonly<{ stdout: string; success: true }>

export type PackagingCommandOptions = Readonly<{
    /**
     * Where the package manager may write its cache.
     *
     * Required, and never derived from `cwd`: Doctor runs package managers inside the very package it is inspecting, so
     * a cache defaulted to the working directory would leave `.npm-cache` behind in the source tree and break the
     * read-only guarantee.
     */
    cacheRoot: string
    cwd?: string
    /** Additional package-manager configuration, applied on top of the inherited environment. */
    extraEnvironment?: Readonly<Record<string, string>>
    timeout?: number
}>

export type TarballExtraction = Readonly<{
    /** Directory holding the manifest, i.e. where a consumer's package root actually is on disk. */
    artifactRoot: string
    /** Packed paths as consumers see them, with the archive's leading root directory removed. */
    files: ReadonlyArray<string>
    /** Directory every entry sits under (npm and pnpm both use `package`), which is how tools address the archive. */
    tarballRoot: string
}>

/** Extract one tarball after rejecting entries that could escape the destination. */
export function extractPackedTarball(
    tarball: string,
    destination: string,
    options: Readonly<{ cacheRoot: string }>,
): TarballExtraction {
    const archive = path.resolve(tarball)
    const run = (args: ReadonlyArray<string>): CommandOutcome =>
        runPackagingCommand('tar', args, { cacheRoot: options.cacheRoot })

    const listed = run(['-tzf', archive])
    if (!listed.success) {
        throw new Error(`Unable to list packed tarball: ${listed.detail}`)
    }
    const entries = listed.stdout.split('\n').filter(Boolean)
    assertSafeTarEntries(entries)

    const types = run(['-tvzf', archive])
    if (!types.success) {
        throw new Error(
            `Unable to inspect packed tarball entry types: ${types.detail}`,
        )
    }
    assertNoArchiveLinks(types.stdout.split('\n').filter(Boolean))

    const extracted = run(['-xzf', archive, '-C', ensureDirectory(destination)])
    if (!extracted.success) {
        throw new Error(`Unable to extract packed tarball: ${extracted.detail}`)
    }

    const roots = new Set(
        entries.map((entry) => entry.split('/')[0] ?? '').filter(Boolean),
    )
    const tarballRoot = roots.size === 1 ? ([...roots][0] ?? 'package') : ''

    return {
        artifactRoot: resolveArtifactRoot(destination),
        files: entries
            .filter((entry) => !entry.endsWith('/'))
            .map((entry) =>
                tarballRoot === ''
                    ? entry
                    : entry.slice(tarballRoot.length + 1),
            )
            .toSorted(),
        tarballRoot,
    }
}

/** Locate the manifest directory, tolerating archives that do not use npm's `package/` convention. */
export function resolveArtifactRoot(extractedRoot: string): string {
    const npmRoot = path.join(extractedRoot, 'package')
    if (existsSync(path.join(npmRoot, 'package.json'))) return npmRoot
    if (existsSync(path.join(extractedRoot, 'package.json'))) {
        return extractedRoot
    }
    for (const entry of readdirSync(extractedRoot)) {
        if (existsSync(path.join(extractedRoot, entry, 'package.json'))) {
            return path.join(extractedRoot, entry)
        }
    }
    throw new Error('Packed tarball does not contain a package manifest')
}

/** Run a packaging command with its cache pinned outside the tree under inspection. */
export function runPackagingCommand(
    command: string,
    args: ReadonlyArray<string>,
    options: PackagingCommandOptions,
): CommandOutcome {
    const result = spawnSync(command, [...args], {
        cwd: options.cwd,
        encoding: 'utf8',
        env: {
            ...process.env,
            npm_config_cache: options.cacheRoot,
            npm_config_update_notifier: 'false',
            ...options.extraEnvironment,
        },
        maxBuffer: 32 * 1024 * 1024,
        shell: false,
        timeout: options.timeout ?? 120_000,
    })
    if (result.status === 0) return { stdout: result.stdout, success: true }
    return {
        detail:
            result.error?.message ||
            result.stderr.trim() ||
            `command exited ${String(result.status)}`,
        stdout: result.stdout,
        success: false,
    }
}

function assertNoArchiveLinks(entries: ReadonlyArray<string>): void {
    for (const entry of entries) {
        const kind = entry.trimStart()[0]
        if (kind === 'l' || kind === 'h') {
            throw new Error('Packed tarball contains a symbolic or hard link')
        }
    }
}

function assertSafeTarEntries(entries: ReadonlyArray<string>): void {
    for (const entry of entries) {
        const normalized = path.posix.normalize(entry)
        if (
            path.posix.isAbsolute(entry) ||
            normalized === '..' ||
            normalized.startsWith('../')
        ) {
            throw new Error(`Packed tarball contains unsafe path: ${entry}`)
        }
    }
}

function ensureDirectory(directory: string): string {
    rmSync(directory, { force: true, recursive: true })
    mkdirSync(directory, { recursive: true })
    return directory
}
