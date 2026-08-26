import {
    jsonTextSchema,
    packageIdentitySchema,
    packageNameSchema,
} from '@snailicid3/node-utils'
import type {
    ReleasePublishClosureEdge,
    ReleasePublishDoctorEvidence,
    WorkspaceSnapshot,
} from '@snailicid3/workspace'
import {
    releasePublishClosureEdgeSchema,
    releasePublishDoctorEvidenceSchema,
} from '@snailicid3/workspace'
import { satisfies } from 'semver'
import { z } from 'zod'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { DoctorDiagnostic } from './types.js'

export const workspaceDependencyKindSchema = z.enum([
    'dependencies',
    'peerDependencies',
    'optionalDependencies',
    'devDependencies',
    'bundleDependencies',
    'bundledDependencies',
])

const dependencyRecordSchema = z.record(packageNameSchema, z.string())
const bundledDependenciesSchema = z.union([
    z.boolean(),
    z.array(packageNameSchema),
])

/** Generic identity plus the packed dependency fields whose health Doctor owns. */
export const packedPackageManifestSchema = packageIdentitySchema.extend({
    bundledDependencies: bundledDependenciesSchema.optional(),
    bundleDependencies: bundledDependenciesSchema.optional(),
    dependencies: dependencyRecordSchema.optional(),
    devDependencies: dependencyRecordSchema.optional(),
    optionalDependencies: dependencyRecordSchema.optional(),
    peerDependencies: dependencyRecordSchema.optional(),
})

export type AnalyzeWorkspaceDependencyClosureInput = Readonly<{
    artifactRoot: string
    facts?: ReadonlyArray<WorkspaceDependencyFact>
    manifest?: PackedPackageManifest
    snapshot: WorkspaceSnapshot
}>

export type PackedPackageManifest = z.output<typeof packedPackageManifestSchema>

export type PackedWorkspaceReferences = Readonly<{
    declaration: ReadonlyArray<string>
    manifest: ReadonlyArray<WorkspaceDependencyKind>
    runtime: ReadonlyArray<string>
}>

export type WorkspaceDependencyClosureAnalysis = Readonly<{
    diagnostics: ReadonlyArray<DoctorDiagnostic>
    edges: ReadonlyArray<WorkspaceDependencyEdge>
    evidence: ReleasePublishDoctorEvidence
    references: Readonly<Record<string, PackedWorkspaceReferences>>
}>

export type WorkspaceDependencyEdge = Readonly<{
    kind: WorkspaceDependencyKind
    name: string
    range?: string
    workspaceMember: true
    workspacePrivate: boolean
}>

export type WorkspaceDependencyFact =
    | Readonly<{ name: string; state: 'included_in_cohort' }>
    | Readonly<{ name: string; state: 'unavailable' }>
    | Readonly<{ name: string; state: 'unknown' }>
    | Readonly<{
          name: string
          state: 'available_in_registry'
          version: string
      }>

export type WorkspaceDependencyKind = z.infer<
    typeof workspaceDependencyKindSchema
>

const MANIFEST_KINDS = [
    'dependencies',
    'peerDependencies',
    'optionalDependencies',
    'devDependencies',
] as const

/** Produce Workspace-compatible evidence from packed-artifact facts supplied by the release caller. */
export function analyzeWorkspaceDependencyClosure(
    input: AnalyzeWorkspaceDependencyClosureInput,
): WorkspaceDependencyClosureAnalysis {
    const manifest = input.manifest ?? readPackedManifest(input.artifactRoot)
    const edges = createWorkspaceDependencyEdges(manifest, input.snapshot)
    const references = inspectPackedWorkspaceReferences(
        input.artifactRoot,
        manifest,
        edges.map((edge) => edge.name),
    )
    const facts = new Map((input.facts ?? []).map((fact) => [fact.name, fact]))
    const closureEdges: Array<ReleasePublishClosureEdge> = []
    const diagnostics: Array<DoctorDiagnostic> = []
    const packageName =
        manifest.name ?? `(unnamed:${path.basename(input.artifactRoot)})`

    for (const edge of primaryEdges(edges)) {
        const refs = references[edge.name] ?? emptyReferences()
        const fact = facts.get(edge.name)
        const resolved = resolveEdge(edge, fact)
        closureEdges.push(resolved)

        if (resolved.resolution === 'unavailable') {
            diagnostics.push({
                code: 'WORKSPACE_DEPENDENCY_UNAVAILABLE',
                evidence: formatReferenceEvidence(edge.name, refs),
                message: `Workspace dependency ${edge.name} is unavailable to consumers of the packed package.`,
                packageName,
                packageRoot: path.resolve(input.artifactRoot),
                severity: 'error',
            })
        } else if (resolved.resolution === 'unknown') {
            diagnostics.push({
                code: 'WORKSPACE_DEPENDENCY_UNKNOWN',
                evidence: formatReferenceEvidence(edge.name, refs),
                message: `Workspace dependency ${edge.name} has no proven consumer resolution.`,
                packageName,
                packageRoot: path.resolve(input.artifactRoot),
                severity: 'warning',
            })
        }
    }

    const parsedEdges = closureEdges
        .map((edge) => releasePublishClosureEdgeSchema.parse(edge))
        .toSorted((left, right) => left.name.localeCompare(right.name))
    const state = parsedEdges.some((edge) => edge.resolution === 'unavailable')
        ? 'blocked'
        : parsedEdges.some((edge) => edge.resolution === 'unknown')
          ? 'unknown'
          : 'valid'
    const evidence = releasePublishDoctorEvidenceSchema.parse({
        artifact: 'unknown',
        closure:
            state === 'unknown' ? { state } : { edges: parsedEdges, state },
    })

    return {
        diagnostics: diagnostics.toSorted(compareDiagnostics),
        edges,
        evidence,
        references,
    }
}

/** Collect only canonical workspace-member edges while retaining manifest kind. */
export function createWorkspaceDependencyEdges(
    manifest: PackedPackageManifest,
    snapshot: WorkspaceSnapshot,
): ReadonlyArray<WorkspaceDependencyEdge> {
    const edges: Array<WorkspaceDependencyEdge> = []

    for (const kind of MANIFEST_KINDS) {
        for (const [name, range] of Object.entries(manifest[kind] ?? {})) {
            const member = snapshot.lookup.get(name)
            if (member === undefined) continue
            edges.push({
                kind,
                name,
                range,
                workspaceMember: true,
                workspacePrivate: member.private === true,
            })
        }
    }

    for (const kind of ['bundleDependencies', 'bundledDependencies'] as const) {
        const configured = manifest[kind]
        if (configured === undefined || typeof configured === 'boolean')
            continue
        for (const name of configured) {
            const member = snapshot.lookup.get(name)
            if (member === undefined) continue
            edges.push({
                kind,
                name,
                workspaceMember: true,
                workspacePrivate: member.private === true,
            })
        }
    }

    return edges.toSorted(compareEdges)
}

/** Inspect the extracted packed package, not source or bundler configuration, for external references. */
export function inspectPackedWorkspaceReferences(
    artifactRootInput: string,
    manifest: PackedPackageManifest,
    dependencyNames: ReadonlyArray<string>,
): Readonly<Record<string, PackedWorkspaceReferences>> {
    const artifactRoot = path.resolve(artifactRootInput)
    const files = collectFiles(artifactRoot)
    const result: Record<string, PackedWorkspaceReferences> = {}

    for (const name of [...new Set(dependencyNames)].toSorted()) {
        const runtime: Array<string> = []
        const declaration: Array<string> = []

        for (const file of files) {
            const relative = path
                .relative(artifactRoot, file)
                .replaceAll('\\', '/')
            if (!isConsumerCodeFile(relative)) continue
            const contents = readFileSync(file, 'utf8')
            if (!containsPackageSpecifier(contents, name)) continue
            if (isDeclarationFile(relative)) declaration.push(relative)
            else runtime.push(relative)
        }

        result[name] = {
            declaration: declaration.toSorted(),
            manifest: manifestKindsForName(manifest, name),
            runtime: runtime.toSorted(),
        }
    }

    return result
}

function collectFiles(root: string): ReadonlyArray<string> {
    const files: Array<string> = []
    const visit = (directory: string): void => {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            const target = path.join(directory, entry.name)
            if (entry.isDirectory()) visit(target)
            else if (entry.isFile()) files.push(target)
        }
    }
    visit(root)
    return files.toSorted()
}

function compareDiagnostics(
    left: DoctorDiagnostic,
    right: DoctorDiagnostic,
): number {
    return (
        left.packageName.localeCompare(right.packageName) ||
        left.code.localeCompare(right.code)
    )
}

function compareEdges(
    left: WorkspaceDependencyEdge,
    right: WorkspaceDependencyEdge,
): number {
    return (
        left.name.localeCompare(right.name) ||
        left.kind.localeCompare(right.kind)
    )
}

function containsPackageSpecifier(
    contents: string,
    packageName: string,
): boolean {
    const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
    return new RegExp(`["']${escaped}(?:/[^"']*)?["']`, 'u').test(contents)
}

function emptyReferences(): PackedWorkspaceReferences {
    return { declaration: [], manifest: [], runtime: [] }
}

function formatReferenceEvidence(
    dependency: string,
    references: PackedWorkspaceReferences,
): ReadonlyArray<string> {
    return [
        ...references.manifest.map(
            (kind) => `package.json#${kind}:${dependency}`,
        ),
        ...references.runtime.map((file) => `runtime:${file}`),
        ...references.declaration.map((file) => `declaration:${file}`),
    ].toSorted()
}

function isConsumerCodeFile(file: string): boolean {
    return (
        /(?:\.[cm]?js|\.[cm]?ts|\.tsx)$/u.test(file) && !file.endsWith('.map')
    )
}

function isDeclarationFile(file: string): boolean {
    return /\.d\.[cm]?ts$/u.test(file)
}

function manifestKindsForName(
    manifest: PackedPackageManifest,
    name: string,
): ReadonlyArray<WorkspaceDependencyKind> {
    const kinds: Array<WorkspaceDependencyKind> = []
    for (const kind of MANIFEST_KINDS) {
        if (manifest[kind]?.[name] !== undefined) kinds.push(kind)
    }
    for (const kind of ['bundleDependencies', 'bundledDependencies'] as const) {
        if (Array.isArray(manifest[kind]) && manifest[kind].includes(name))
            kinds.push(kind)
    }
    return kinds
}

function normalizeWorkspaceRange(range: string): string {
    if (!range.startsWith('workspace:')) return range
    const normalized = range.slice('workspace:'.length)
    return normalized === '' ? '*' : normalized
}

function primaryEdges(
    edges: ReadonlyArray<WorkspaceDependencyEdge>,
): ReadonlyArray<WorkspaceDependencyEdge> {
    const priorities: ReadonlyArray<WorkspaceDependencyKind> = [
        'dependencies',
        'peerDependencies',
        'optionalDependencies',
    ]
    const selected = new Map<string, WorkspaceDependencyEdge>()
    for (const kind of priorities) {
        for (const edge of edges) {
            if (edge.kind === kind && !selected.has(edge.name))
                selected.set(edge.name, edge)
        }
    }
    return [...selected.values()].toSorted(compareEdges)
}

function readPackedManifest(root: string): PackedPackageManifest {
    return jsonTextSchema
        .pipe(packedPackageManifestSchema)
        .parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
}

function resolveEdge(
    edge: WorkspaceDependencyEdge,
    fact: undefined | WorkspaceDependencyFact,
): ReleasePublishClosureEdge {
    if (fact?.state === 'available_in_registry') {
        const range = normalizeWorkspaceRange(edge.range ?? '*')
        if (!satisfies(fact.version, range, { includePrerelease: false })) {
            return { name: edge.name, resolution: 'unknown' }
        }
        return {
            name: edge.name,
            range: edge.range ?? '*',
            resolution: 'available_in_registry',
            satisfiedBy: fact.version,
        }
    }
    if (fact?.state === 'included_in_cohort') {
        return {
            name: edge.name,
            range: edge.range ?? '*',
            resolution: fact.state,
        }
    }
    if (fact?.state === 'unavailable') {
        return {
            name: edge.name,
            range: edge.range ?? '*',
            resolution: fact.state,
        }
    }
    return { name: edge.name, resolution: 'unknown' }
}
