import micromatch from 'micromatch'

export type ScopePathMatcherOverrides = Readonly<
    Record<string, null | ReadonlyArray<string>>
>

export type ScopePathMatchers = Readonly<Record<string, ReadonlyArray<string>>>

export const DEFAULT_SCOPE_PATH_MATCHERS = {
    actions: [
        '.github/workflows/**',
        '.github/actions/**',
        '.github/scripts/**',
    ],
    notes: ['notes/**'],
    scripts: ['scripts/**'],
} as const satisfies ScopePathMatchers

export const SNAILICID3_COMMITLINT_CONFIG_KEY = 'snailicid3' as const

export type Snailicid3CommitlintSettings = {
    scopeMatchers: ScopePathMatchers
}

/** Match a normalized repository path against every configured scope. */
export function matchScopesForPath(
    relativePath: string,
    matchers: ScopePathMatchers = DEFAULT_SCOPE_PATH_MATCHERS,
): Array<string> {
    return Object.entries(matchers)
        .filter(([, patterns]) =>
            micromatch.isMatch(relativePath, [...patterns], { dot: true }),
        )
        .map(([scope]) => scope)
        .toSorted()
}

/** Apply per-scope replacements and null removals to the built-in matcher map. */
export function resolveScopePathMatchers(
    overrides: ScopePathMatcherOverrides = {},
): ScopePathMatchers {
    const resolved = new Map<string, ReadonlyArray<string>>(
        Object.entries(DEFAULT_SCOPE_PATH_MATCHERS),
    )

    for (const [scope, patterns] of Object.entries(overrides)) {
        if (!scope.trim())
            throw new Error('Scope matcher names cannot be empty')

        if (patterns === null || patterns.length === 0) {
            resolved.delete(scope)
            continue
        }

        if (!patterns.every((pattern) => typeof pattern === 'string')) {
            throw new Error(
                `Scope matcher "${scope}" must contain only strings`,
            )
        }

        resolved.set(scope, [...patterns])
    }

    return Object.fromEntries(resolved)
}

/** Read matcher metadata stored on a generated commitlint config. */
export function scopeMatchersFromCommitlintConfig(
    config: unknown,
): ScopePathMatchers {
    if (!config || typeof config !== 'object') {
        return DEFAULT_SCOPE_PATH_MATCHERS
    }

    const settings = (config as Record<string, unknown>)[
        SNAILICID3_COMMITLINT_CONFIG_KEY
    ]

    if (!settings || typeof settings !== 'object') {
        return DEFAULT_SCOPE_PATH_MATCHERS
    }

    const matchers = (settings as Record<string, unknown>).scopeMatchers

    if (!matchers || typeof matchers !== 'object' || Array.isArray(matchers)) {
        return DEFAULT_SCOPE_PATH_MATCHERS
    }

    return validateResolvedMatchers(matchers)
}

function validateResolvedMatchers(value: object): ScopePathMatchers {
    const matchers: Record<string, ReadonlyArray<string>> = {}

    for (const [scope, patterns] of Object.entries(value)) {
        if (
            !scope.trim() ||
            !Array.isArray(patterns) ||
            !patterns.every((pattern) => typeof pattern === 'string')
        ) {
            throw new Error(`Invalid resolved scope matcher: ${scope}`)
        }

        if (patterns.length > 0) matchers[scope] = patterns
    }

    return matchers
}
