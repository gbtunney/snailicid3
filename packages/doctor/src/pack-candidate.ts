import { jsonTextSchema, packageIdentitySchema } from '@snailicid3/node-utils'
import { z } from 'zod'
import { spawnSync } from 'node:child_process'
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

/**
 * One publication candidate, created once and shared by every artifact collector.
 *
 * The point of the type is that packing is a boundary the caller crosses deliberately — a build/pack step or a selected
 * release operation — rather than something each validator does for itself. Publint and ATTW both read this exact
 * tarball, so two collectors can never disagree because they packed the source twice.
 */
export type PackCandidate = Readonly<{
    artifactRoot: string
    files: ReadonlyArray<string>
    manifest: PackedManifest
    packageName: string
    tarball: string
    tarballBytes: Uint8Array
    /** Directory every tarball entry sits under (npm uses `package`), which is how tools address the archive. */
    tarballRoot: string
}>

/** Pack a source package, or adopt a tarball a build or release step already produced. */
export type PackCandidateInput =
    Readonly<{ packageRoot: string }> | Readonly<{ tarball: string }>

export type PackedManifest = z.output<typeof packedManifestSchema>

const packedManifestSchema = packageIdentitySchema

type Disposable = PackCandidate & { dispose: () => void }

/**
 * Produce the candidate without running the source package's lifecycle scripts.
 *
 * `npm pack` is asked to ignore scripts because Doctor is read-only: preparing a package for inspection must not run
 * arbitrary `prepack` code from the package being inspected.
 */
export function createPackCandidate(input: PackCandidateInput): Disposable {
    const temporaryRoot = mkdtempSync(
        path.join(tmpdir(), 'snail-doctor-candidate-'),
    )
    const dispose = (): void => {
        rmSync(temporaryRoot, { force: true, recursive: true })
    }

    try {
        const tarball =
            'tarball' in input
                ? path.resolve(input.tarball)
                : packSourcePackage(input.packageRoot, temporaryRoot)
        const extractedRoot = path.join(temporaryRoot, 'extracted')
        const { files, root: tarballRoot } = extractTarball(
            tarball,
            extractedRoot,
        )
        const artifactRoot = resolveArtifactRoot(extractedRoot)
        const manifest = jsonTextSchema
            .pipe(packedManifestSchema)
            .parse(
                readFileSync(path.join(artifactRoot, 'package.json'), 'utf8'),
            )

        return {
            artifactRoot,
            dispose,
            files,
            manifest,
            packageName: manifest.name ?? path.basename(artifactRoot),
            tarball,
            tarballBytes: new Uint8Array(readFileSync(tarball)),
            tarballRoot,
        }
    } catch (error) {
        dispose()
        throw error
    }
}

/** Create the candidate and guarantee its temporary directories are removed once the collectors are done. */
export async function withPackCandidate<Result>(
    input: PackCandidateInput,
    collect: (candidate: PackCandidate) => Promise<Result> | Result,
): Promise<Result> {
    const candidate = createPackCandidate(input)
    try {
        return await collect(candidate)
    } finally {
        candidate.dispose()
    }
}

function assertSafeEntries(entries: ReadonlyArray<string>): void {
    for (const entry of entries) {
        const normalized = path.posix.normalize(entry)
        if (
            path.posix.isAbsolute(entry) ||
            normalized === '..' ||
            normalized.startsWith('../')
        ) {
            throw new Error(`Pack candidate contains unsafe path: ${entry}`)
        }
    }
}

function ensureDirectory(directory: string): string {
    rmSync(directory, { force: true, recursive: true })
    mkdirSync(directory, { recursive: true })
    return directory
}

/** Packed paths as consumers see them, with npm's leading `package/` removed. */
function extractTarball(
    tarball: string,
    destination: string,
): { files: ReadonlyArray<string>; root: string } {
    const listed = run('tar', ['-tzf', tarball])
    if (!listed.success) {
        throw new Error(`Unable to list pack candidate: ${listed.detail}`)
    }
    const entries = listed.stdout.split('\n').filter(Boolean)
    assertSafeEntries(entries)

    const types = run('tar', ['-tvzf', tarball])
    if (!types.success) {
        throw new Error(
            `Unable to inspect pack candidate entries: ${types.detail}`,
        )
    }
    for (const entry of types.stdout.split('\n').filter(Boolean)) {
        const kind = entry.trimStart()[0]
        if (kind === 'l' || kind === 'h') {
            throw new Error('Pack candidate contains a symbolic or hard link')
        }
    }

    const extracted = run('tar', [
        '-xzf',
        tarball,
        '-C',
        ensureDirectory(destination),
    ])
    if (!extracted.success) {
        throw new Error(`Unable to extract pack candidate: ${extracted.detail}`)
    }

    const roots = new Set(
        entries.map((entry) => entry.split('/')[0] ?? '').filter(Boolean),
    )
    const root = roots.size === 1 ? ([...roots][0] ?? 'package') : ''

    return {
        files: entries
            .filter((entry) => !entry.endsWith('/'))
            .map((entry) =>
                root === '' ? entry : entry.slice(root.length + 1),
            )
            .toSorted(),
        root,
    }
}

function packSourcePackage(packageRoot: string, destination: string): string {
    const packed = run(
        'npm',
        [
            'pack',
            '--ignore-scripts',
            '--json',
            '--pack-destination',
            destination,
        ],
        path.resolve(packageRoot),
    )
    if (!packed.success) {
        throw new Error(`Unable to pack candidate: ${packed.detail}`)
    }
    const parsed = jsonTextSchema
        .pipe(z.array(z.object({ filename: z.string() })).min(1))
        .safeParse(packed.stdout)
    if (!parsed.success) {
        throw new Error('npm pack did not report a packed filename')
    }
    return path.join(destination, parsed.data[0]?.filename ?? '')
}

function resolveArtifactRoot(extractedRoot: string): string {
    const npmRoot = path.join(extractedRoot, 'package')
    if (existsSync(path.join(npmRoot, 'package.json'))) return npmRoot
    if (existsSync(path.join(extractedRoot, 'package.json')))
        return extractedRoot
    for (const entry of readdirSync(extractedRoot)) {
        if (existsSync(path.join(extractedRoot, entry, 'package.json'))) {
            return path.join(extractedRoot, entry)
        }
    }
    throw new Error('Pack candidate does not contain a package manifest')
}

function run(
    command: string,
    args: ReadonlyArray<string>,
    cwd?: string,
):
    | Readonly<{ detail: string; stdout: string; success: false }>
    | Readonly<{ stdout: string; success: true }> {
    const result = spawnSync(command, [...args], {
        cwd,
        encoding: 'utf8',
        env: {
            ...process.env,
            npm_config_cache: path.join(cwd ?? tmpdir(), '.npm-cache'),
            npm_config_update_notifier: 'false',
        },
        maxBuffer: 32 * 1024 * 1024,
        timeout: 120_000,
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
