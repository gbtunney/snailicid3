import {
    type CommandResult,
    readPackageManifest,
    runCommand,
} from '@snailicid3/node-utils'
import { z } from 'zod'
import path from 'node:path'
import { getRepoRoot } from './git.js'
import { getWorkspaceSnapshot, type WorkspacePackage } from './packages.js'
import {
    type ReleaseRegistryObservation,
    releaseRegistryObservationSchema,
    type ReleaseRegistryState,
} from './release-plan.js'

/** The registry npm falls back to when no configuration selects one. */
const DEFAULT_NPM_REGISTRY = 'https://registry.npmjs.org/'

/**
 * Npm error codes where a registry answered but refused to say what it holds.
 *
 * A refusal is not an absence. Collapsing these into `missing` is the specific mistake #206 calls out, because it turns
 * "we were not allowed to look" into "this version was never published".
 */
const AUTH_ERROR_CODES = new Set([
    'E401',
    'E403',
    'EAUTHIP',
    'EAUTHUNKNOWN',
    'ENEEDAUTH',
    'EOTP',
])

/** Npm error codes where the request never reached a registry that could answer at all. */
const NETWORK_ERROR_CODES = new Set([
    'CERT_HAS_EXPIRED',
    'DEPTH_ZERO_SELF_SIGNED_CERT',
    'EAI_AGAIN',
    'ECONNABORTED',
    'ECONNREFUSED',
    'ECONNRESET',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'ENOTFOUND',
    'EPIPE',
    'EPROTO',
    'ERR_SOCKET_TIMEOUT',
    'ERR_TLS_CERT_ALTNAME_INVALID',
    'ETIMEDOUT',
    'FETCH_ERROR',
    'SELF_SIGNED_CERT_IN_CHAIN',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
])

/** The packument fields this slice reads, kept tolerant of everything else npm prints. */
const npmPackumentSchema = z.looseObject({
    'dist-tags': z.record(z.string(), z.string()).optional(),
    'versions': z.union([z.string(), z.array(z.string())]),
})

/** The structured failure npm prints to stdout under `--json`. */
const npmErrorSchema = z.looseObject({
    error: z.looseObject({ code: z.string().optional() }),
})

/** `publishConfig.registry`, read from a manifest that `packageIdentitySchema` has already accepted. */
const publishConfigSchema = z.looseObject({
    publishConfig: z
        .looseObject({ registry: z.string().optional() })
        .optional(),
})

/**
 * Runs `npm` and returns its normalized result.
 *
 * Injected rather than imported so every resolution and classification path can be driven from fixtures. The registry
 * behavior this module encodes is mostly about failures, and failures are exactly what a live network will not produce
 * on demand.
 *
 * Internal to the package. It was public only to type the `runNpm` option, and a consumer able to substitute the runner
 * could replace registry observation wholesale while still calling it an observation.
 */
export type NpmCommandRunner = (args: ReadonlyArray<string>) => CommandResult

export type ObserveWorkspaceRegistryOptions = {
    repoRoot?: string
}

/** One package's exact-version observation, shaped to drop straight into a release-plan package input. */
export type WorkspaceRegistryObservation = {
    name: string
    registry: ReleaseRegistryObservation
    version: string
}

type NpmViewOutcome =
    | { code: string; kind: 'error' }
    | {
          distTags: Record<string, string>
          kind: 'packument'
          versions: Array<string>
      }
    | { kind: 'unreadable' }

/** What a workspace member's own manifest said about `publishConfig.registry`. */
type PublishConfigResult =
    | { kind: 'absent' }
    | { kind: 'unreadable' }
    | { kind: 'value'; registry: string }

/**
 * What `npm config get` reported.
 *
 * A failed config read is kept distinct from a config that simply selects nothing. Collapsing the two would let a
 * broken read fall through to npm's default registry and report an answer as though the default had been chosen.
 */
type RegistryConfigResult =
    { kind: 'read'; values: Map<string, string> } | { kind: 'unreadable' }

/**
 * The registry a package will be asked about.
 *
 * `flags` is empty whenever npm's own configuration already selects this registry: re-stating it in argv would gain
 * nothing and, for a configured URL carrying inline credentials, would copy a secret into a process argument list.
 * Flags are used only to override npm — that is, when the target came from the package's own `publishConfig`.
 */
type TargetRegistry =
    | { flags: Array<string>; kind: 'resolved'; registryUrl: string }
    | { kind: 'unresolved' }

/**
 * The observation itself, over members someone else resolved and through a runner someone else supplied.
 *
 * Kept off the package barrel deliberately. Tests need both seams — a fabricated workspace, and a runner that produces
 * the failures a live network will not produce on demand — but neither belongs to consumers. A caller able to pass its
 * own member list could route around {@link getWorkspaceSnapshot}, and one able to pass its own runner could replace the
 * registry lookup entirely while the result still claimed to be an observation of npm.
 */
export function observeRegistryForMembers(
    repoRoot: string,
    packages: ReadonlyArray<WorkspacePackage>,
    runNpm: NpmCommandRunner,
): Array<WorkspaceRegistryObservation> {
    const registryConfig = readNpmRegistryConfig(
        packages.map((pkg) => pkg.name),
        runNpm,
    )

    return packages.map((pkg) => {
        const target = resolveTargetRegistry(
            pkg.name,
            readPublishConfigRegistry(repoRoot, pkg),
            registryConfig,
        )

        return {
            name: pkg.name,
            registry: observePackageRegistry(pkg, target, runNpm),
            version: pkg.version,
        }
    })
}

/**
 * Observe every canonical workspace package against its resolved target registry.
 *
 * Membership comes from the package manager's own workspace listing rather than a filesystem walk, so a package is
 * observed because the workspace claims it, not because a `package.json` happened to be found.
 *
 * Private packages are never looked up. They cannot publish through npm whatever a registry reports, so querying would
 * leak a private name to a third party to learn something that cannot change the outcome. Their observation is recorded
 * as `unknown_registry`, which is literally true — nothing was asked.
 */
export function observeWorkspaceRegistry(
    options: ObserveWorkspaceRegistryOptions = {},
): Array<WorkspaceRegistryObservation> {
    const repoRoot = options.repoRoot ?? getRepoRoot({ fallbackToCwd: true })

    return observeRegistryForMembers(
        repoRoot,
        getWorkspaceSnapshot(repoRoot).list,
        createNpmCommandRunner(repoRoot),
    )
}

/** Validate every recorded observation, so a credential can never reach a plan even if stripping were bypassed. */
function buildObservation(
    registryUrl: null | string,
    distTags: Record<string, string>,
    state: ReleaseRegistryState,
): ReleaseRegistryObservation {
    return releaseRegistryObservationSchema.parse({
        distTags,
        registryUrl,
        state,
    })
}

/** Map an npm error code to a release-plan registry state, defaulting to unknown rather than absent. */
function classifyRegistryErrorCode(code: string): ReleaseRegistryState {
    if (code === 'E404') return 'missing'
    if (AUTH_ERROR_CODES.has(code)) return 'unknown_auth'
    if (NETWORK_ERROR_CODES.has(code)) return 'unknown_network'

    return 'unknown_registry'
}

/** The real IO seam: `npm` run from the repository root so it resolves the repository's own npm configuration. */
function createNpmCommandRunner(repoRoot: string): NpmCommandRunner {
    return (args) => runCommand('npm', args, { cwd: repoRoot })
}

/** Whether a URL carries credentials inline, which must never be copied into argv. */
function hasInlineCredentials(value: string): boolean {
    try {
        const url = new URL(value)

        return url.username !== '' || url.password !== ''
    } catch {
        return false
    }
}

/**
 * Ask one registry what it holds for a package, then decide existence from `versions` alone.
 *
 * `dist-tags` travels back untouched. A tag is a pointer a publisher can move at any time, so it can describe a channel
 * but must never answer whether an exact `name@version` exists — the two are read from different fields here so they
 * cannot be conflated by accident.
 */
function observePackageRegistry(
    pkg: WorkspacePackage,
    target: TargetRegistry,
    runNpm: NpmCommandRunner,
): ReleaseRegistryObservation {
    if (target.kind === 'unresolved') {
        return buildObservation(null, {}, 'unknown_registry')
    }

    const { registryUrl } = target

    if (pkg.private === true) {
        return buildObservation(registryUrl, {}, 'unknown_registry')
    }

    const outcome = readNpmView(pkg.name, target.flags, runNpm)

    if (outcome.kind === 'error') {
        return buildObservation(
            registryUrl,
            {},
            classifyRegistryErrorCode(outcome.code),
        )
    }

    if (outcome.kind === 'unreadable') {
        return buildObservation(registryUrl, {}, 'unknown_registry')
    }

    return buildObservation(
        registryUrl,
        outcome.distTags,
        outcome.versions.includes(pkg.version) ? 'exists' : 'missing',
    )
}

/** The scope prefix of a package name, or null when the name is unscoped. */
function packageScope(name: string): null | string {
    if (!name.startsWith('@')) return null

    const separator = name.indexOf('/')

    return separator === -1 ? null : name.slice(0, separator)
}

/** Parse a JSON document, returning null rather than throwing on anything unparseable. */
function parseJson(value: string): unknown {
    try {
        return JSON.parse(value)
    } catch {
        return null
    }
}

/** Parse the `key=value` lines `npm config get` prints, treating npm's literal `undefined` as absent. */
function parseNpmConfigValues(
    stdout: string,
    keys: ReadonlyArray<string>,
): Map<string, string> {
    const values = new Map<string, string>()

    if (keys.length === 1) {
        const only = stdout.trim()

        if (only !== '' && only !== 'undefined') values.set(keys[0], only)

        return values
    }

    for (const line of stdout.split('\n')) {
        const separator = line.indexOf('=')

        if (separator === -1) continue

        const key = line.slice(0, separator).trim()
        const value = line.slice(separator + 1).trim()

        if (value !== '' && value !== 'undefined' && value !== 'null') {
            values.set(key, value)
        }
    }

    return values
}

/** Recover an npm error code from stderr when `--json` produced nothing parseable. */
function readNpmErrorCode(stderr: string): null | string {
    const match = /npm (?:error|ERR!) code (?<code>\S+)/u.exec(stderr)

    return match?.groups?.['code'] ?? null
}

/**
 * Read the registry npm would use, per scope and overall, in one call.
 *
 * Only registry keys are requested. A full `npm config ls` dump would also carry `_authToken` and `_auth` entries, and
 * the safest way to keep a credential out of a report is never to read it.
 */
function readNpmRegistryConfig(
    names: ReadonlyArray<string>,
    runNpm: NpmCommandRunner,
): RegistryConfigResult {
    const scopes = [
        ...new Set(
            names
                .map((name) => packageScope(name))
                .filter((scope): scope is string => scope !== null),
        ),
    ].toSorted()

    const keys = ['registry', ...scopes.map((scope) => `${scope}:registry`)]
    const result = runNpm(['config', 'get', ...keys])

    return result.success
        ? { kind: 'read', values: parseNpmConfigValues(result.stdout, keys) }
        : { kind: 'unreadable' }
}

/** Ask npm for a package's version list and dist-tags, and report whether the answer was usable. */
function readNpmView(
    name: string,
    flags: ReadonlyArray<string>,
    runNpm: NpmCommandRunner,
): NpmViewOutcome {
    const result = runNpm([
        'view',
        name,
        'versions',
        'dist-tags',
        '--json',
        ...flags,
    ])
    const parsed = parseJson(result.stdout)

    if (parsed !== null) {
        const failure = npmErrorSchema.safeParse(parsed)

        if (failure.success) {
            return { code: failure.data.error.code ?? '', kind: 'error' }
        }

        const packument = npmPackumentSchema.safeParse(parsed)

        if (packument.success) {
            const versions = packument.data.versions

            return {
                distTags: packument.data['dist-tags'] ?? {},
                kind: 'packument',
                versions: typeof versions === 'string' ? [versions] : versions,
            }
        }
    }

    const code = readNpmErrorCode(result.stderr)

    return code === null ? { kind: 'unreadable' } : { code, kind: 'error' }
}

/** Read `publishConfig.registry` from a workspace member's own manifest. */
function readPublishConfigRegistry(
    repoRoot: string,
    pkg: WorkspacePackage,
): PublishConfigResult {
    const manifest = readPackageManifest(
        path.join(repoRoot, pkg.path, 'package.json'),
    )

    if (!manifest.success) return { kind: 'unreadable' }

    const parsed = publishConfigSchema.safeParse(manifest.data)

    if (!parsed.success) return { kind: 'unreadable' }

    const registry = parsed.data.publishConfig?.registry

    return registry === undefined
        ? { kind: 'absent' }
        : { kind: 'value', registry }
}

/**
 * Resolve the registry a package would publish to, or report that it cannot be named truthfully.
 *
 * Most specific wins: the package's own `publishConfig.registry`, then a `@scope:registry` configuration, then the
 * overall `registry` configuration, then npm's default. A package-specific publish target outranks general npm config
 * because it is the registry that package actually publishes to.
 *
 * Only a `publishConfig` target produces npm flags. Everything else is already npm's own configuration, so npm will
 * select it unaided — passing it back in argv would add nothing and would copy any inline credentials into a process
 * argument list. That also means an inline-credential `publishConfig` URL is unresolved rather than exposed: there is
 * no way to override npm toward it without putting the secret on the command line.
 *
 * Every path that cannot establish a target returns `unresolved`, and no registry is queried for it. A read that failed
 * is never treated as a read that found nothing.
 */
function resolveTargetRegistry(
    name: string,
    publishConfig: PublishConfigResult,
    registryConfig: RegistryConfigResult,
): TargetRegistry {
    if (publishConfig.kind === 'unreadable') return { kind: 'unresolved' }

    if (publishConfig.kind === 'value') {
        const registryUrl = toCredentialFreeRegistryUrl(publishConfig.registry)

        if (
            registryUrl === null ||
            hasInlineCredentials(publishConfig.registry)
        )
            return { kind: 'unresolved' }

        const scope = packageScope(name)

        return {
            flags: [
                `--registry=${registryUrl}`,
                ...(scope === null
                    ? []
                    : [`--${scope}:registry=${registryUrl}`]),
            ],
            kind: 'resolved',
            registryUrl,
        }
    }

    if (registryConfig.kind === 'unreadable') return { kind: 'unresolved' }

    const scope = packageScope(name)
    const configured =
        (scope === null
            ? undefined
            : registryConfig.values.get(`${scope}:registry`)) ??
        registryConfig.values.get('registry')

    if (configured === undefined) {
        return {
            flags: [],
            kind: 'resolved',
            registryUrl: DEFAULT_NPM_REGISTRY,
        }
    }

    const registryUrl = toCredentialFreeRegistryUrl(configured)

    return registryUrl === null
        ? { kind: 'unresolved' }
        : { flags: [], kind: 'resolved', registryUrl }
}

/** Normalize a registry URL for recording, dropping any inline credentials and rejecting anything not http(s). */
function toCredentialFreeRegistryUrl(value: string): null | string {
    let url: URL

    try {
        url = new URL(value)
    } catch {
        return null
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

    url.password = ''
    url.username = ''

    return url.href
}
