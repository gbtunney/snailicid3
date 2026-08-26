import type {
    ReleasePublishClosureEdge,
    ReleasePublishDoctorEvidence,
    WorkspaceSnapshot,
} from '@snailicid3/workspace'
import {
    releasePublishClosureEdgeSchema,
    releasePublishDoctorEvidenceSchema,
} from '@snailicid3/workspace'
import { z } from 'zod'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

export const workspaceDependencyKindSchema = z.enum([
    'dependencies',
    'peerDependencies',
    'optionalDependencies',
    'devDependencies',
    'bundleDependencies',
    'bundledDependencies',
])

export type EmbeddedWorkspaceCodeEvidence = Readonly<{
    files: ReadonlyArray<string>
    name: string
}>

export type PackedPackageManifest = Readonly<{
    bundledDependencies?: boolean | ReadonlyArray<string>
    bundleDependencies?: boolean | ReadonlyArray<string>
    dependencies?: Readonly<Record<string, string>>
    devDependencies?: Readonly<Record<string, string>>
    name?: string
    optionalDependencies?: Readonly<Record<string, string>>
    peerDependencies?: Readonly<Record<string, string>>
    private?: boolean
    version?: string
}>

export type PackedWorkspaceReferences = Readonly<{
    declaration: ReadonlyArray<string>
    manifest: ReadonlyArray<WorkspaceDependencyKind>
    runtime: ReadonlyArray<string>
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

export const dependencyClosureFindingCodeSchema = z.enum([
    'WORKSPACE_DEPENDENCY_UNAVAILABLE',
    'WORKSPACE_DEPENDENCY_UNKNOWN',
    'WORKSPACE_DEPENDENCY_RESIDUAL_REFERENCE',
    'PRIVATE_WORKSPACE_CODE_DISCLOSURE_REVIEW',
])

export type AnalyzeWorkspaceDependencyClosureInput = Readonly<{
    artifactRoot: string
    artifactVerdict?: 'invalid' | 'unknown' | 'valid'
    embeddedWorkspaceCode?: ReadonlyArray<EmbeddedWorkspaceCodeEvidence>
    facts?: ReadonlyArray<WorkspaceDependencyFact>
    manifest?: PackedPackageManifest
    snapshot: WorkspaceSnapshot
}>

export type DependencyClosureFinding = Readonly<{
    code: z.infer<typeof dependencyClosureFindingCodeSchema>
    dependency: string
    evidence: ReadonlyArray<string>
    severity: 'error' | 'warning'
}>

export type WorkspaceDependencyClosureAnalysis = Readonly<{
    edges: ReadonlyArray<WorkspaceDependencyEdge>
    evidence: ReleasePublishDoctorEvidence
    findings: ReadonlyArray<DependencyClosureFinding>
    references: Readonly<Record<string, PackedWorkspaceReferences>>
}>

const MANIFEST_KINDS = [
    'dependencies',
    'peerDependencies',
    'optionalDependencies',
    'devDependencies',
] as const

type ParsedSemver = Readonly<{ major: number; minor: number; patch: number }>

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
    const embedded = new Map(
        (input.embeddedWorkspaceCode ?? []).map((entry) => [entry.name, entry]),
    )
    const closureEdges: Array<ReleasePublishClosureEdge> = []
    const findings: Array<DependencyClosureFinding> = []

    for (const edge of primaryEdges(edges)) {
        const refs = references[edge.name] ?? emptyReferences()
        const exposed = refs.runtime.length > 0 || refs.declaration.length > 0
        const embeddedEvidence = embedded.get(edge.name)

        if (
            !exposed &&
            embeddedEvidence !== undefined &&
            embeddedEvidence.files.length > 0
        ) {
            closureEdges.push({
                name: edge.name,
                resolution: 'embedded_not_exposed',
            })
            if (edge.workspacePrivate) {
                findings.push({
                    code: 'PRIVATE_WORKSPACE_CODE_DISCLOSURE_REVIEW',
                    dependency: edge.name,
                    evidence: [...embeddedEvidence.files].toSorted(),
                    severity: 'warning',
                })
            }
            continue
        }

        const fact = facts.get(edge.name)
        const resolved = resolveEdge(edge, fact)
        closureEdges.push(resolved)

        if (exposed && embeddedEvidence !== undefined) {
            findings.push({
                code: 'WORKSPACE_DEPENDENCY_RESIDUAL_REFERENCE',
                dependency: edge.name,
                evidence: [...refs.runtime, ...refs.declaration].toSorted(),
                severity: 'error',
            })
        }
        if (resolved.resolution === 'unavailable') {
            findings.push({
                code: 'WORKSPACE_DEPENDENCY_UNAVAILABLE',
                dependency: edge.name,
                evidence: [
                    ...refs.manifest,
                    ...refs.runtime,
                    ...refs.declaration,
                ],
                severity: 'error',
            })
        } else if (resolved.resolution === 'unknown') {
            findings.push({
                code: 'WORKSPACE_DEPENDENCY_UNKNOWN',
                dependency: edge.name,
                evidence: [
                    ...refs.manifest,
                    ...refs.runtime,
                    ...refs.declaration,
                ],
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
        artifact: input.artifactVerdict ?? 'unknown',
        closure:
            state === 'unknown' ? { state } : { edges: parsedEdges, state },
    })

    return {
        edges,
        evidence,
        findings: findings.toSorted(compareFindings),
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
            else if (entry.isFile() || statSync(target).isFile())
                files.push(target)
        }
    }
    visit(root)
    return files.toSorted()
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

function compareFindings(
    left: DependencyClosureFinding,
    right: DependencyClosureFinding,
): number {
    return (
        left.dependency.localeCompare(right.dependency) ||
        left.code.localeCompare(right.code)
    )
}

function compareSemver(left: ParsedSemver, right: ParsedSemver): number {
    return (
        left.major - right.major ||
        left.minor - right.minor ||
        left.patch - right.patch
    )
}

function containsPackageSpecifier(
    contents: string,
    packageName: string,
): boolean {
    const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
    return new RegExp(
        `(?:from\\s*|import\\s*|import\\s*\\(|require\\s*\\(|reference\\s+types=)["']${escaped}(?:/[^"']*)?["']`,
        'u',
    ).test(contents)
}

function emptyReferences(): PackedWorkspaceReferences {
    return { declaration: [], manifest: [], runtime: [] }
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

function parseSemver(value: string): null | ParsedSemver {
    const match =
        /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.exec(
            value,
        )
    return match === null
        ? null
        : {
              major: Number(match[1]),
              minor: Number(match[2]),
              patch: Number(match[3]),
          }
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
    return JSON.parse(
        readFileSync(path.join(root, 'package.json'), 'utf8'),
    ) as PackedPackageManifest
}

function resolveEdge(
    edge: WorkspaceDependencyEdge,
    fact: undefined | WorkspaceDependencyFact,
): ReleasePublishClosureEdge {
    if (fact?.state === 'available_in_registry') {
        if (!satisfiesSupportedRange(fact.version, edge.range ?? '*')) {
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

/** Conservatively validate the common workspace ranges without becoming a registry resolver. */
function satisfiesSupportedRange(version: string, rangeInput: string): boolean {
    const range = rangeInput.startsWith('workspace:')
        ? rangeInput.slice('workspace:'.length)
        : rangeInput
    if (range === '' || range === '*') return true

    const parsedVersion = parseSemver(version)
    if (parsedVersion === null) return false
    const operator = range[0]
    const targetText =
        operator === '^' || operator === '~' ? range.slice(1) : range
    const target = parseSemver(targetText)
    if (target === null) return false
    if (operator === '^') {
        if (target.major > 0)
            return (
                parsedVersion.major === target.major &&
                compareSemver(parsedVersion, target) >= 0
            )
        if (target.minor > 0)
            return (
                parsedVersion.major === 0 &&
                parsedVersion.minor === target.minor &&
                compareSemver(parsedVersion, target) >= 0
            )
        return (
            parsedVersion.major === 0 &&
            parsedVersion.minor === 0 &&
            parsedVersion.patch === target.patch
        )
    }
    if (operator === '~') {
        return (
            parsedVersion.major === target.major &&
            parsedVersion.minor === target.minor &&
            compareSemver(parsedVersion, target) >= 0
        )
    }
    return compareSemver(parsedVersion, target) === 0
}
