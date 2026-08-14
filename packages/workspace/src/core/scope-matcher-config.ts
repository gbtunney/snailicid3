import { cosmiconfig, defaultLoaders } from 'cosmiconfig'
import { TypeScriptLoader } from 'cosmiconfig-typescript-loader'
import {
    SNAILICID3_COMMITLINT_CONFIG_KEY,
    type WorkspaceScopeOverrides,
    workspaceScopeOverridesSchema,
} from './workspace-scopes.js'

const COMMITLINT_SEARCH_PLACES = [
    'package.json',
    '.commitlintrc',
    '.commitlintrc.json',
    '.commitlintrc.yaml',
    '.commitlintrc.yml',
    '.commitlintrc.js',
    '.commitlintrc.cjs',
    '.commitlintrc.mjs',
    '.commitlintrc.ts',
    '.commitlintrc.cts',
    '.commitlintrc.mts',
    'commitlint.config.js',
    'commitlint.config.cjs',
    'commitlint.config.mjs',
    'commitlint.config.ts',
    'commitlint.config.cts',
    'commitlint.config.mts',
] as const

/**
 * Load scope overrides from the repository's existing Commitlint config.
 *
 * Missing configuration is normal and yields no overrides. Malformed configuration is an error rather than a silent
 * fall back to defaults, which previously made a typo indistinguishable from an absent block.
 */
export async function loadScopePathMatchers(
    repoRoot: string,
): Promise<WorkspaceScopeOverrides> {
    const typeScriptLoader = TypeScriptLoader()
    const explorer = cosmiconfig('commitlint', {
        loaders: {
            ...defaultLoaders,
            '.cts': typeScriptLoader,
            '.mts': typeScriptLoader,
            '.ts': typeScriptLoader,
        },
        searchPlaces: [...COMMITLINT_SEARCH_PLACES],
        searchStrategy: 'global',
    })
    const result = await explorer.search(repoRoot)

    if (!result) return {}

    const resultConfig: unknown = result.config
    const config =
        typeof resultConfig === 'function'
            ? await (resultConfig as () => unknown)()
            : await resultConfig

    if (!config || typeof config !== 'object') return {}

    const settings = (config as Record<string, unknown>)[
        SNAILICID3_COMMITLINT_CONFIG_KEY
    ]

    if (!settings || typeof settings !== 'object') return {}

    const overrides = (settings as Record<string, unknown>).scopeMatchers

    if (overrides === undefined) return {}

    return workspaceScopeOverridesSchema.parse(overrides)
}

export default loadScopePathMatchers
