import { jsonTextSchema, packageNameSchema } from '@snailicid3/node-utils'
import type { WorkspacePackage, WorkspaceSnapshot } from '@snailicid3/workspace'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

export type CollectEmbeddedWorkspaceCodeProvenanceInput = Readonly<{
    artifactRoot: string
    packageName?: string
    snapshot: WorkspaceSnapshot
}>

/**
 * How the packed artifact itself proves that another workspace package's code travels inside it.
 *
 * Every kind here is read out of the artifact, never out of bundler configuration and never out of a caller's claim.
 * `bundled_module` is deliberately separate from the other two: npm shipping `node_modules/<name>` keeps the dependency
 * resolvable under its own specifier, which is a different mechanism from a bundler inlining its source.
 */
export type EmbeddedProvenanceKind =
    'bundled_module' | 'sourcemap' | 'vendored_content'

export type EmbeddedWorkspaceCodeProvenance = Readonly<{
    evidence: ReadonlyArray<string>
    kind: EmbeddedProvenanceKind
    name: string
    workspacePrivate: boolean
}>

type ArtifactFile = Readonly<{ absolute: string; relative: string }>

const INLINE_SOURCE_MAP =
    /\/[/*]#\s*sourceMappingURL=data:application\/json[^,]*base64,([A-Za-z0-9+/=]+)/gu

/** Content small enough to collide by accident between unrelated generated files proves nothing. */
const MINIMUM_VENDORED_BYTES = 128

const SKIPPED_MEMBER_DIRECTORIES = new Set([
    '.git',
    '.nx',
    '.turbo',
    'coverage',
    'node_modules',
])

const bundledManifestSchema = z.looseObject({
    name: packageNameSchema.optional(),
})

const sourceMapSchema = z.looseObject({
    sourceRoot: z.string().optional(),
    sources: z.array(z.string()).optional(),
})

/**
 * Read the extracted artifact for authoritative evidence that another workspace package's code is inside it.
 *
 * Membership comes from the canonical Workspace snapshot, so this never walks the third-party graph, and the analyzed
 * package is excluded so a package's own sources cannot be mistaken for an embedded dependency. Absence of provenance
 * is reported as absence, never as proof that nothing is embedded: a stripped bundle with no sourcemaps and no verbatim
 * file copies is simply not something this artifact can speak to.
 */
export function collectEmbeddedWorkspaceCodeProvenance(
    input: CollectEmbeddedWorkspaceCodeProvenanceInput,
): ReadonlyArray<EmbeddedWorkspaceCodeProvenance> {
    const artifactRoot = path.resolve(input.artifactRoot)
    const members = analyzableMembers(input.snapshot, input.packageName)
    if (members.length === 0) return []

    const files = collectArtifactFiles(artifactRoot)
    const collected = new Map<
        string,
        Map<EmbeddedProvenanceKind, Set<string>>
    >()
    const record = (
        name: string,
        kind: EmbeddedProvenanceKind,
        evidence: string,
    ): void => {
        const kinds =
            collected.get(name) ??
            new Map<EmbeddedProvenanceKind, Set<string>>()
        const entries = kinds.get(kind) ?? new Set<string>()
        entries.add(evidence)
        kinds.set(kind, entries)
        collected.set(name, kinds)
    }

    collectBundledModules(files, members, record)
    collectSourceMapProvenance(files, members, record)
    collectVendoredContent(files, members, input.snapshot.repoRoot, record)

    const provenance: Array<EmbeddedWorkspaceCodeProvenance> = []
    for (const member of members) {
        for (const [kind, evidence] of collected.get(member.name) ?? []) {
            provenance.push({
                evidence: [...evidence].toSorted(),
                kind,
                name: member.name,
                workspacePrivate: member.private === true,
            })
        }
    }

    return provenance.toSorted(
        (left, right) =>
            left.name.localeCompare(right.name) ||
            left.kind.localeCompare(right.kind),
    )
}

/** True when the segment sequence of a workspace location appears whole inside a source path. */
export function containsPathSegments(
    segments: ReadonlyArray<string>,
    needle: ReadonlyArray<string>,
): boolean {
    if (needle.length === 0 || needle.length > segments.length) return false
    for (let start = 0; start + needle.length <= segments.length; start++) {
        if (needle.every((part, offset) => segments[start + offset] === part))
            return true
    }
    return false
}

/** Normalize a sourcemap `sources` entry to comparable path segments without resolving it on disk. */
export function normalizeSourceSegments(
    source: string,
    sourceRoot?: string,
): ReadonlyArray<string> {
    const rooted =
        sourceRoot === undefined || sourceRoot === ''
            ? source
            : `${sourceRoot.replace(/\/+$/u, '')}/${source}`
    return rooted
        .replace(/^[a-z][a-z\d+\-.]*:\/\//iu, '')
        .replaceAll('\\', '/')
        .split('/')
        .filter((segment) => segment !== '' && segment !== '.')
}

function analyzableMembers(
    snapshot: WorkspaceSnapshot,
    packageName: string | undefined,
): ReadonlyArray<WorkspacePackage> {
    const self =
        packageName === undefined ? undefined : snapshot.lookup.get(packageName)
    return snapshot.list.filter(
        (member) =>
            member.name !== packageName &&
            memberSegments(member).length > 0 &&
            (self === undefined || member.path !== self.path),
    )
}

function attributesTo(
    segments: ReadonlyArray<string>,
    member: WorkspacePackage,
): boolean {
    return (
        containsPathSegments(segments, [
            'node_modules',
            ...member.name.split('/'),
        ]) || containsPathSegments(segments, memberSegments(member))
    )
}

function collectArtifactFiles(root: string): ReadonlyArray<ArtifactFile> {
    const files: Array<ArtifactFile> = []
    const visit = (directory: string): void => {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            const absolute = path.join(directory, entry.name)
            if (entry.isDirectory()) visit(absolute)
            else if (entry.isFile()) {
                files.push({
                    absolute,
                    relative: path
                        .relative(root, absolute)
                        .replaceAll('\\', '/'),
                })
            }
        }
    }
    visit(root)
    return files.toSorted((left, right) =>
        left.relative.localeCompare(right.relative),
    )
}

function collectBundledModules(
    files: ReadonlyArray<ArtifactFile>,
    members: ReadonlyArray<WorkspacePackage>,
    record: (
        name: string,
        kind: EmbeddedProvenanceKind,
        evidence: string,
    ) => void,
): void {
    const names = new Set(members.map((member) => member.name))
    for (const file of files) {
        if (!file.relative.endsWith('/package.json')) continue
        if (!file.relative.split('/').includes('node_modules')) continue
        const parsed = jsonTextSchema
            .pipe(bundledManifestSchema)
            .safeParse(readFileSync(file.absolute, 'utf8'))
        const name = parsed.success ? parsed.data.name : undefined
        // The shipped manifest naming itself is what attributes the directory, not the path it happens to sit at.
        if (name === undefined || !names.has(name)) continue
        record(name, 'bundled_module', `bundled:${file.relative}`)
    }
}

function collectMemberFiles(root: string): ReadonlyArray<string> {
    const files: Array<string> = []
    const visit = (directory: string): void => {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            if (entry.isDirectory()) {
                if (SKIPPED_MEMBER_DIRECTORIES.has(entry.name)) continue
                visit(path.join(directory, entry.name))
            } else if (entry.isFile() && isCodeFile(entry.name)) {
                files.push(path.join(directory, entry.name))
            }
        }
    }
    visit(root)
    return files.toSorted()
}

function collectSourceMapProvenance(
    files: ReadonlyArray<ArtifactFile>,
    members: ReadonlyArray<WorkspacePackage>,
    record: (
        name: string,
        kind: EmbeddedProvenanceKind,
        evidence: string,
    ) => void,
): void {
    for (const file of files) {
        for (const map of readSourceMaps(file)) {
            for (const source of map.sources ?? []) {
                const segments = normalizeSourceSegments(source, map.sourceRoot)
                for (const member of members) {
                    if (!attributesTo(segments, member)) continue
                    record(
                        member.name,
                        'sourcemap',
                        `sourcemap:${file.relative}:${source}`,
                    )
                }
            }
        }
    }
}

function collectVendoredContent(
    files: ReadonlyArray<ArtifactFile>,
    members: ReadonlyArray<WorkspacePackage>,
    repoRoot: string,
    record: (
        name: string,
        kind: EmbeddedProvenanceKind,
        evidence: string,
    ) => void,
): void {
    const byDigest = new Map<string, Array<string>>()
    for (const file of files) {
        if (file.relative.split('/').includes('node_modules')) continue
        if (!isCodeFile(file.relative)) continue
        const contents = readFileSync(file.absolute)
        if (contents.byteLength < MINIMUM_VENDORED_BYTES) continue
        const digest = createHash('sha256').update(contents).digest('hex')
        byDigest.set(digest, [...(byDigest.get(digest) ?? []), file.relative])
    }
    if (byDigest.size === 0) return

    for (const member of members) {
        const memberRoot = resolveMemberRoot(repoRoot, member)
        if (memberRoot === null) continue
        for (const source of collectMemberFiles(memberRoot)) {
            const contents = readFileSync(source)
            if (contents.byteLength < MINIMUM_VENDORED_BYTES) continue
            const digest = createHash('sha256').update(contents).digest('hex')
            const relative = path
                .relative(memberRoot, source)
                .replaceAll('\\', '/')
            for (const target of byDigest.get(digest) ?? []) {
                record(
                    member.name,
                    'vendored_content',
                    `content:${target}=${member.path}/${relative}`,
                )
            }
        }
    }
}

function isCodeFile(file: string): boolean {
    return /(?:\.[cm]?js|\.[cm]?ts|\.tsx|\.jsx)$/u.test(file)
}

function memberSegments(member: WorkspacePackage): ReadonlyArray<string> {
    return member.path
        .replaceAll('\\', '/')
        .split('/')
        .filter((segment) => segment !== '' && segment !== '.')
}

function readSourceMaps(
    file: ArtifactFile,
): ReadonlyArray<z.output<typeof sourceMapSchema>> {
    if (file.relative.endsWith('.map')) {
        const parsed = jsonTextSchema
            .pipe(sourceMapSchema)
            .safeParse(readFileSync(file.absolute, 'utf8'))
        return parsed.success ? [parsed.data] : []
    }
    if (!isCodeFile(file.relative)) return []

    const contents = readFileSync(file.absolute, 'utf8')
    const maps: Array<z.output<typeof sourceMapSchema>> = []
    for (const [, payload] of contents.matchAll(INLINE_SOURCE_MAP)) {
        const parsed = jsonTextSchema
            .pipe(sourceMapSchema)
            .safeParse(Buffer.from(payload, 'base64').toString('utf8'))
        if (parsed.success) maps.push(parsed.data)
    }
    return maps
}

/** Keep member lookups inside the repository and tolerate a snapshot describing packages that are not checked out. */
function resolveMemberRoot(
    repoRoot: string,
    member: WorkspacePackage,
): null | string {
    const resolvedRepoRoot = path.resolve(repoRoot)
    const memberRoot = path.resolve(resolvedRepoRoot, member.path)
    if (
        memberRoot !== resolvedRepoRoot &&
        !memberRoot.startsWith(`${resolvedRepoRoot}${path.sep}`)
    ) {
        return null
    }
    if (!existsSync(memberRoot) || !statSync(memberRoot).isDirectory())
        return null
    return memberRoot
}
