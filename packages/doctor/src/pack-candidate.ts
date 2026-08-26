import { jsonTextSchema, packageIdentitySchema } from '@snailicid3/node-utils'
import { z } from 'zod'
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { extractPackedTarball, runPackagingCommand } from './packed-tar.js'

/**
 * One publication candidate, created once and shared by every artifact collector.
 *
 * The point of the type is that packing is a boundary the caller crosses deliberately — a build/pack step or a selected
 * release operation — rather than something each validator does for itself. Dependency closure, Publint and ATTW all
 * read this exact tarball, so two collectors can never disagree because they packed the source twice.
 */
export type PackCandidate = Readonly<{
    artifactRoot: string
    files: ReadonlyArray<string>
    manifest: PackedManifest
    /** How the candidate came to exist, which is what tells a reader whether workspace ranges were materialized. */
    origin: PackCandidateOrigin
    packageName: string
    tarball: string
    tarballBytes: Uint8Array
    /** Directory every tarball entry sits under (npm and pnpm use `package`), which is how tools address the archive. */
    tarballRoot: string
}>

/**
 * Pack a source package, or adopt a tarball a build or release step already produced.
 *
 * Adopting is the preferred boundary. A tarball the release path produced is the artifact that will actually be
 * published; anything Doctor packs itself is a reconstruction of it.
 */
export type PackCandidateInput =
    | Readonly<{ packageManager?: SourcePackageManager; packageRoot: string }>
    | Readonly<{ tarball: string }>

export type PackCandidateOrigin =
    | Readonly<{ kind: 'adopted' }>
    | Readonly<{ kind: 'packed'; packageManager: SourcePackageManager }>

export type PackedManifest = z.output<typeof packedManifestSchema>

/**
 * The package manager asked to pack a source package.
 *
 * This is not a cosmetic preference. Workspace packages depend on each other through the `workspace:` protocol, and
 * that protocol is replaced with a real version range at pack time by the workspace's own package manager. `npm pack`
 * does not perform the replacement, so it emits a manifest still carrying `workspace:*` — a specifier no registry
 * consumer could ever install. Validating that manifest would describe a package that is never published.
 */
export type SourcePackageManager = 'npm' | 'pnpm'

type Disposable = PackCandidate & { dispose: () => void }

const packedManifestSchema = packageIdentitySchema

/** Lockfiles that identify their manager unambiguously. */
const LOCKFILE_OWNERS: ReadonlyArray<readonly [string, SourcePackageManager]> =
    [
        ['package-lock.json', 'npm'],
        ['pnpm-lock.yaml', 'pnpm'],
    ]

/** Manifest fields naming a packed tarball, across npm's array form and pnpm's single-object form. */
const packReportSchema = z.union([
    z.object({ filename: z.string() }).array().min(1),
    z.object({ filename: z.string() }).transform((entry) => [entry]),
])

/**
 * Produce the candidate without running the source package's lifecycle scripts.
 *
 * Scripts are suppressed because Doctor is read-only: preparing a package for inspection must not run arbitrary
 * `prepack` code from the package being inspected. This matters more than it looks — pnpm runs `prepack` during `pnpm
 * pack` by default, and such a script can write into the very source tree Doctor promises not to touch.
 */
export function createPackCandidate(input: PackCandidateInput): Disposable {
    const temporaryRoot = mkdtempSync(
        path.join(tmpdir(), 'snail-doctor-candidate-'),
    )
    const dispose = (): void => {
        rmSync(temporaryRoot, { force: true, recursive: true })
    }

    try {
        // The package manager's cache is pinned inside the candidate's own temporary root, never inside the package
        // being inspected, so packing cannot leave a `.npm-cache` behind in the source tree.
        const cacheRoot = path.join(temporaryRoot, 'package-manager-cache')
        mkdirSync(cacheRoot, { recursive: true })

        const packed = packInput(input, temporaryRoot, cacheRoot)
        const { artifactRoot, files, tarballRoot } = extractPackedTarball(
            packed.tarball,
            path.join(temporaryRoot, 'extracted'),
            { cacheRoot },
        )
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
            origin: packed.origin,
            packageName: manifest.name ?? path.basename(artifactRoot),
            tarball: packed.tarball,
            tarballBytes: new Uint8Array(readFileSync(packed.tarball)),
            tarballRoot,
        }
    } catch (error) {
        dispose()
        throw error
    }
}

/**
 * The package manager that owns the repository the package sits in, read from repository evidence.
 *
 * Deliberately not guessed. Doctor inspects npm and pnpm workspaces alike, and the two disagree about the one thing
 * this decision controls: pnpm replaces `workspace:` ranges at pack time and npm does not. Assuming a default would
 * mean an npm repository that never declared `packageManager` gets packed by the wrong manager and validated as a
 * manifest it will never publish — the silent wrong answer this function exists to prevent.
 *
 * Evidence is read nearest-first, and the first directory that answers wins: an explicit `packageManager` field, then a
 * lockfile, then a pnpm workspace definition. When nothing answers, the caller is asked to say which manager owns the
 * package rather than being handed a guess.
 */
export function detectSourcePackageManager(
    packageRoot: string,
): SourcePackageManager {
    const resolved = path.resolve(packageRoot)
    let directory = resolved

    for (;;) {
        const detected = detectFromDirectory(directory)
        if (detected !== undefined) return detected
        const parent = path.dirname(directory)
        if (parent === directory) break
        directory = parent
    }

    throw new Error(
        `Unable to determine the package manager for ${resolved}: no packageManager field, pnpm-lock.yaml or package-lock.json was found in it or any ancestor. Pass packageManager explicitly.`,
    )
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

/**
 * The reason a pack failed, preferring the manager's structured report.
 *
 * pnpm refuses to pack a package whose workspace dependencies are not installed, because it cannot resolve `workspace:`
 * to a real range — and it says so as JSON on stdout while leaving stderr empty. Falling back to the exit status would
 * turn that actionable message into "command exited 1". The refusal itself is correct behaviour worth surfacing rather
 * than working around: an unresolved workspace range must not reach a validator as if it were publishable.
 */
/** Evidence in one directory, in the order a reader would trust it. */
function detectFromDirectory(
    directory: string,
): SourcePackageManager | undefined {
    const declared = readDeclaredPackageManager(directory)
    if (declared !== undefined) return declared

    const lockfiles = LOCKFILE_OWNERS.filter(([file]) =>
        existsSync(path.join(directory, file)),
    )
    if (lockfiles.length > 1) {
        throw new Error(
            `Ambiguous package manager for ${directory}: it contains ${lockfiles.map(([file]) => file).join(' and ')}. Pass packageManager explicitly.`,
        )
    }
    if (lockfiles.length === 1) return lockfiles[0]?.[1]

    // A pnpm workspace definition identifies the manager even before an install has produced a lockfile.
    return existsSync(path.join(directory, 'pnpm-workspace.yaml'))
        ? 'pnpm'
        : undefined
}

function packFailureDetail(
    outcome: Readonly<{ detail: string; stdout: string }>,
): string {
    const reported = jsonTextSchema
        .pipe(z.object({ error: z.object({ message: z.string() }) }))
        .safeParse(outcome.stdout)
    return reported.success ? reported.data.error.message : outcome.detail
}

function packInput(
    input: PackCandidateInput,
    temporaryRoot: string,
    cacheRoot: string,
): { origin: PackCandidateOrigin; tarball: string } {
    if ('tarball' in input) {
        return {
            origin: { kind: 'adopted' },
            tarball: path.resolve(input.tarball),
        }
    }
    const packageManager =
        input.packageManager ?? detectSourcePackageManager(input.packageRoot)
    return {
        origin: { kind: 'packed', packageManager },
        tarball: packSourcePackage(
            input.packageRoot,
            path.join(temporaryRoot, 'packed'),
            packageManager,
            cacheRoot,
        ),
    }
}

function packSourcePackage(
    packageRoot: string,
    destination: string,
    packageManager: SourcePackageManager,
    cacheRoot: string,
): string {
    mkdirSync(destination, { recursive: true })
    const packed = runPackagingCommand(
        packageManager,
        packageManager === 'pnpm'
            ? [
                  'pack',
                  // Pnpm rejects a bare `--ignore-scripts` on `pack`; the config form is how the flag reaches it.
                  '--config.ignore-scripts=true',
                  '--json',
                  '--pack-destination',
                  destination,
              ]
            : [
                  'pack',
                  '--ignore-scripts',
                  '--json',
                  '--pack-destination',
                  destination,
              ],
        {
            cacheRoot,
            cwd: path.resolve(packageRoot),
            // Belt and braces: the config flag covers the invoked manager, the environment covers anything it spawns.
            extraEnvironment: { npm_config_ignore_scripts: 'true' },
        },
    )
    if (!packed.success) {
        throw new Error(
            `Unable to pack candidate with ${packageManager}: ${packFailureDetail(packed)}`,
        )
    }

    const parsed = jsonTextSchema
        .pipe(packReportSchema)
        .safeParse(packed.stdout)
    if (!parsed.success) {
        throw new Error(
            `${packageManager} pack did not report a packed filename`,
        )
    }
    // Npm reports a bare filename against the pack destination; pnpm reports an absolute path.
    const filename = parsed.data[0]?.filename ?? ''
    return path.isAbsolute(filename)
        ? filename
        : path.join(destination, filename)
}

/** The `packageManager` field corepack and CI already agree on, when a directory declares one. */
function readDeclaredPackageManager(
    directory: string,
): SourcePackageManager | undefined {
    const manifestPath = path.join(directory, 'package.json')
    if (!existsSync(manifestPath)) return undefined

    const declared = jsonTextSchema
        .pipe(z.object({ packageManager: z.string().optional() }))
        .safeParse(readFileSync(manifestPath, 'utf8'))
    const name = declared.success
        ? declared.data.packageManager?.split('@')[0]
        : undefined
    return name === 'npm' || name === 'pnpm' ? name : undefined
}
