import { packageNameSchema, packageVersionSchema } from '@snailicid3/node-utils'
import { z } from 'zod'
import { existsSync } from 'node:fs'
import path from 'node:path'

/**
 * Observable manifest state, carried on the Doctor report so a consumer need not re-read `package.json`.
 *
 * Facts, never judgement. Doctor deliberately publishes no release status, publication eligibility or hold state here:
 * `private`, `publishConfig.access` and a `0.0.0` version are three separate observations, and none of them is a "hold
 * publication" switch. Deciding what any of it means for a release is Workspace's job, taken together with release
 * intent and registry state that Doctor cannot see. Encoding a verdict here would put house policy inside a shape
 * GitHub Actions eventually reads, which is exactly the layering #206 separates.
 *
 * Fields carry only values that parsed against the canonical shared schemas. A malformed name or version is therefore
 * absent here and present as a diagnostic instead, so a consumer can trust what it reads without re-validating, and the
 * malformed text still survives as diagnostic evidence.
 */
export const manifestFactsSchema = z.strictObject({
    /** `publishConfig.access`, when declared. Observation only: it is npm access, not release intent. */
    access: z.enum(['public', 'restricted']).optional(),
    /** Declared `bin` names, sorted. Empty when the package declares none. */
    binNames: z.array(z.string()),
    /** The `type` field, which decides how Node interprets this package's `.js` files. */
    moduleType: z.enum(['commonjs', 'module']).optional(),
    name: packageNameSchema.optional(),
    /** `true` only when declared `true`; npm treats an absent field as publishable, so absence records as `false`. */
    private: z.boolean(),
    repository: z
        .strictObject({
            /** `repository.directory`, which is how a consumer locates one package inside a monorepo. */
            directory: z.string().optional(),
            url: z.string().optional(),
        })
        .optional(),
    version: packageVersionSchema.optional(),
})

export type ManifestFacts = z.output<typeof manifestFactsSchema>

/**
 * How a package participates in the repository, used only to choose which completeness diagnostics apply.
 *
 * Kept internal on purpose. It is a classification Doctor makes for its own reporting, and publishing it would invite
 * consumers to treat it as a canonical contract before anyone has shown that two of them need the same one.
 */
export type PackageRole = 'cli' | 'internal' | 'library' | 'workspaceRoot'

/** Metadata a publishable package is expected to carry, beyond the identity every package needs. */
const PUBLISHABLE_METADATA_FIELDS = [
    'description',
    'license',
    'author',
    'repository',
] as const

/** Project the parsed identity and the raw manifest into the facts a downstream consumer can rely on. */
export function collectManifestFacts(
    identity: Record<string, unknown>,
    rawManifest: Record<string, unknown>,
): ManifestFacts {
    return {
        binNames: readBinNames(rawManifest['bin']),
        private: rawManifest['private'] === true,
        ...optionalField('access', readAccess(rawManifest['publishConfig'])),
        ...optionalField('moduleType', readModuleType(rawManifest['type'])),
        ...optionalField(
            'name',
            readValid(packageNameSchema, identity['name']),
        ),
        ...optionalField('repository', readRepository(identity['repository'])),
        ...optionalField(
            'version',
            readValid(packageVersionSchema, identity['version']),
        ),
    }
}

/**
 * Classify a package from what the repository can observe about it.
 *
 * A workspace root and a private package are both excused publication metadata, for different reasons: the root is not
 * a package anyone installs, and a private package is not published at all. Order matters — a private CLI is still
 * unpublished, so `internal` is decided before `cli`.
 */
export function derivePackageRole(
    packageRoot: string,
    facts: ManifestFacts,
    rawManifest: Record<string, unknown>,
): PackageRole {
    if (isWorkspaceRoot(packageRoot, rawManifest)) return 'workspaceRoot'
    if (facts.private) return 'internal'
    return facts.binNames.length > 0 ? 'cli' : 'library'
}

/**
 * Whether the package sits inside a pnpm workspace that starts above it.
 *
 * Only then is `repository.directory` meaningful: it is what tells a consumer which subdirectory of the repository the
 * package lives in, and a single-package repository has no such subdirectory to name.
 */
export function isMonorepoMember(packageRoot: string): boolean {
    const resolved = path.resolve(packageRoot)
    let directory = path.dirname(resolved)

    for (;;) {
        if (existsSync(path.join(directory, 'pnpm-workspace.yaml'))) return true
        const parent = path.dirname(directory)
        if (parent === directory) return false
        directory = parent
    }
}

/** The metadata fields this role is expected to declare, in a stable order. */
export function requiredMetadataFields(
    role: PackageRole,
): ReadonlyArray<string> {
    return role === 'cli' || role === 'library'
        ? PUBLISHABLE_METADATA_FIELDS
        : []
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isWorkspaceRoot(
    packageRoot: string,
    rawManifest: Record<string, unknown>,
): boolean {
    return (
        existsSync(path.join(packageRoot, 'pnpm-workspace.yaml')) ||
        Array.isArray(rawManifest['workspaces'])
    )
}

/** Spread helper that keeps an absent fact absent rather than present-and-undefined. */
function optionalField<Key extends string, Value>(
    key: Key,
    value: undefined | Value,
): Partial<Record<Key, Value>> {
    return value === undefined ? {} : ({ [key]: value } as Record<Key, Value>)
}

function readAccess(
    publishConfig: unknown,
): 'public' | 'restricted' | undefined {
    if (!isRecord(publishConfig)) return undefined
    const access = publishConfig['access']
    return access === 'public' || access === 'restricted' ? access : undefined
}

function readBinNames(bin: unknown): Array<string> {
    if (typeof bin === 'string') return ['(package name)']
    if (!isRecord(bin)) return []
    return Object.keys(bin).toSorted()
}

function readModuleType(type: unknown): 'commonjs' | 'module' | undefined {
    return type === 'commonjs' || type === 'module' ? type : undefined
}

function readRepository(repository: unknown): ManifestFacts['repository'] {
    if (typeof repository === 'string') return { url: repository }
    if (!isRecord(repository)) return undefined

    const directory = repository['directory']
    const url = repository['url']
    return {
        ...(typeof directory === 'string' ? { directory } : {}),
        ...(typeof url === 'string' ? { url } : {}),
    }
}

/** A value is a fact only when it satisfies the canonical schema; anything else is a diagnostic's business. */
function readValid<Output>(
    schema: z.ZodType<Output>,
    value: unknown,
): Output | undefined {
    const parsed = schema.safeParse(value)
    return parsed.success ? parsed.data : undefined
}
