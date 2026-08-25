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
 */
export type NpmCommandRunner = (args: ReadonlyArray<string>) => CommandResult

export type ObserveWorkspaceRegistryOptions = {
    packages?: ReadonlyArray<WorkspacePackage>
    repoRoot?: string
    runNpm?: NpmCommandRunner
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
    const runNpm = options.runNpm ?? createNpmCommandRunner(repoRoot)
    const packages = options.packages ?? getWorkspaceSnapshot(repoRoot).list

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

/** Validate every recorded observation, so a credential can never reach a plan even if stripping were bypassed. */
function buildObservation(
    registryUrl: string,
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

/**
 * Ask one registry what it holds for a package, then decide existence from `versions` alone.
 *
 * `dist-tags` travels back untouched. A tag is a pointer a publisher can move at any time, so it can describe a channel
 * but must never answer whether an exact `name@version` exists — the two are read from different fields here so they
 * cannot be conflated by accident.
 */
function observePackageRegistry(
    pkg: WorkspacePackage,
    requestUrl: null | string,
    runNpm: NpmCommandRunner,
): ReleaseRegistryObservation {
    if (requestUrl === null) {
        return buildObservation(DEFAULT_NPM_REGISTRY, {}, 'unknown_registry')
    }

    const registryUrl =
        toCredentialFreeRegistryUrl(requestUrl) ?? DEFAULT_NPM_REGISTRY

    if (pkg.private === true) {
        return buildObservation(registryUrl, {}, 'unknown_registry')
    }

    const outcome = readNpmView(pkg.name, requestUrl, runNpm)

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
): Map<string, string> {
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
        ? parseNpmConfigValues(result.stdout, keys)
        : new Map<string, string>()
}

/** Ask npm for a package's version list and dist-tags, and report whether the answer was usable. */
function readNpmView(
    name: string,
    registryUrl: string,
    runNpm: NpmCommandRunner,
): NpmViewOutcome {
    const scope = packageScope(name)
    const args = [
        'view',
        name,
        'versions',
        'dist-tags',
        '--json',
        `--registry=${registryUrl}`,
    ]

    // A configured `@scope:registry` outranks `--registry` inside npm, so a scoped lookup must pin the scope key too or
    // the recorded URL could name a registry that was never actually queried.
    if (scope !== null) args.push(`--${scope}:registry=${registryUrl}`)

    const result = runNpm(args)
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
): string | undefined {
    const manifest = readPackageManifest(
        path.join(repoRoot, pkg.path, 'package.json'),
    )

    if (!manifest.success) return undefined

    const parsed = publishConfigSchema.safeParse(manifest.data)

    return parsed.success ? parsed.data.publishConfig?.registry : undefined
}

/**
 * Resolve the registry a package would publish to.
 *
 * Most specific wins: the package's own `publishConfig.registry`, then a `@scope:registry` configuration, then the
 * overall `registry` configuration, then npm's default. Returning null means configuration named a registry that cannot
 * be used, which is a resolution failure rather than a reason to quietly fall back — npm only warns and reaches for the
 * default, which would attribute an answer to a registry nobody selected.
 */
function resolveTargetRegistry(
    name: string,
    publishConfigRegistry: string | undefined,
    registryConfig: Map<string, string>,
): null | string {
    const scope = packageScope(name)
    const configured =
        publishConfigRegistry ??
        (scope === null
            ? undefined
            : registryConfig.get(`${scope}:registry`)) ??
        registryConfig.get('registry')

    if (configured === undefined) return DEFAULT_NPM_REGISTRY

    return toCredentialFreeRegistryUrl(configured) === null ? null : configured
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
