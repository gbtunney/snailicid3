import { z } from 'zod'
import { uniqueSorted } from './array.js'
import type { WorkspaceSnapshot } from './packages.js'
import type { RepositoryScopeClassifiers } from './repository-scopes.js'
import { shortenScopeName } from './scopes.js'

/**
 * The single scope-definition model.
 *
 * Plan §5 specified this contract but nothing implemented it: the old `resolveScopePathMatchers` treated `null` and
 * `[]` as deletion, had no way to express a manual scope, and replaced rather than combined. This module is the
 * implementation, and it is what Commitlint's scope-enum and the file classifiers are both derived from, so the two can
 * no longer drift.
 */

export type ResolvedWorkspaceScopes = {
    /** Only scopes carrying patterns. Manual (`true`) scopes are deliberately absent. */
    classifiers: RepositoryScopeClassifiers
    /** Every valid scope, including manual ones. */
    definitions: WorkspaceScopes
    /** Sorted scope names — the Commitlint `scope-enum` value. */
    names: Array<string>
    /** Contributing sources per scope. More than one means a collision was merged. */
    sources: Readonly<Record<string, Array<WorkspaceScopeSource>>>
}

/** A scope that is valid: either it has matchers, or it is manual. */
export type WorkspaceScopeDefinition = ReadonlyArray<string> | true

/** What a consumer may supply. `false` disables; `undefined` inherits. */
export type WorkspaceScopeOverride = boolean | ReadonlyArray<string> | undefined

export type WorkspaceScopeOverrides = Readonly<
    Record<string, WorkspaceScopeOverride>
>

export type WorkspaceScopes = Readonly<Record<string, WorkspaceScopeDefinition>>

/** Where a scope's definition came from, so collisions are inspectable rather than silent. */
export type WorkspaceScopeSource = 'override' | 'package' | 'standard'

/**
 * Repository-level scopes that exist regardless of which packages are present.
 *
 * Moved here from the legacy matcher module: the data is still useful, its old home is not.
 */
export const STANDARD_WORKSPACE_SCOPES = {
    actions: [
        '.github/workflows/**',
        '.github/actions/**',
        '.github/scripts/**',
    ],
    notes: ['notes/**'],
    scripts: ['scripts/**'],
} as const satisfies Record<string, ReadonlyArray<string>>

/** `root` is always a valid scope even though nothing classifies into it automatically. */
export const BASE_WORKSPACE_SCOPES = ['root'] as const

const scopeNameSchema = z.string().trim().min(1, 'Scope names cannot be empty')

/**
 * A consumer's overrides.
 *
 * An empty array is rejected rather than treated as deletion, because `[]` and `false` previously meant the same thing
 * and there was no way to say "valid, but matched manually". `true` says that; `false` deletes.
 */
export const workspaceScopeOverridesSchema = z.record(
    scopeNameSchema,
    z
        .union([
            z.boolean(),
            z
                .array(z.string().min(1))
                .nonempty(
                    'Use `true` for a scope with no matchers, not an empty array',
                ),
        ])
        .optional(),
)

/**
 * Combine discovered packages, standard repository scopes and consumer overrides into one model.
 *
 * Array overrides are **unioned** with an existing definition rather than replacing it. A custom key matching a
 * shortened package name would otherwise drop that package's own patterns, and the scope-enum side hides that because
 * the name survives either way — only the file-to-scope mapping changes.
 */
export function getWorkspaceScopes(options: {
    keepPrefix?: boolean
    overrides?: WorkspaceScopeOverrides
    snapshot: WorkspaceSnapshot
    standardScopes?: Readonly<Record<string, ReadonlyArray<string>>>
}): ResolvedWorkspaceScopes {
    const {
        keepPrefix = false,
        overrides = {},
        snapshot,
        standardScopes = STANDARD_WORKSPACE_SCOPES,
    } = options

    const parsedOverrides = workspaceScopeOverridesSchema.parse(overrides)
    const definitions = new Map<string, WorkspaceScopeDefinition>()
    const sources = new Map<string, Array<WorkspaceScopeSource>>()

    const contribute = (
        scope: string,
        value: WorkspaceScopeDefinition,
        source: WorkspaceScopeSource,
    ): void => {
        const existing = definitions.get(scope)

        definitions.set(
            scope,
            existing === undefined || existing === true || value === true
                ? // A manual scope on either side stays manual: it has no patterns to union.
                  value === true || existing === true
                    ? true
                    : value
                : uniqueSorted([...existing, ...value]),
        )

        sources.set(
            scope,
            uniqueSorted([
                ...(sources.get(scope) ?? []),
                source,
            ]) as Array<WorkspaceScopeSource>,
        )
    }

    for (const scope of BASE_WORKSPACE_SCOPES)
        contribute(scope, true, 'standard')

    for (const [scope, patterns] of Object.entries(standardScopes)) {
        contribute(scope, patterns, 'standard')
    }

    for (const workspacePackage of snapshot.list) {
        // Root is identified by its normalized path, never by its name — a nested package may be
        // legitimately called `@scope/root`, and a `./**` classifier would match every file.
        if (workspacePackage.path === '.') continue

        contribute(
            shortenScopeName(workspacePackage.name, keepPrefix),
            [`${workspacePackage.path}/**`],
            'package',
        )
    }

    for (const [scope, override] of Object.entries(parsedOverrides)) {
        // `undefined` inherits the discovered or standard definition rather than replacing it.
        if (override === undefined) continue

        if (override === false) {
            definitions.delete(scope)
            sources.delete(scope)
            continue
        }

        contribute(scope, override === true ? true : override, 'override')
    }

    const classifiers: Record<string, Array<string>> = {}

    for (const [scope, definition] of definitions) {
        if (definition !== true) classifiers[scope] = [...definition]
    }

    return {
        classifiers,
        definitions: Object.fromEntries(definitions),
        names: uniqueSorted([...definitions.keys()]),
        sources: Object.fromEntries(sources),
    }
}
