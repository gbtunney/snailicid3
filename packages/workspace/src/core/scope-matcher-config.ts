import { cosmiconfig, defaultLoaders } from 'cosmiconfig'
import { TypeScriptLoader } from 'cosmiconfig-typescript-loader'
import {
    DEFAULT_SCOPE_PATH_MATCHERS,
    scopeMatchersFromCommitlintConfig,
    type ScopePathMatchers,
} from './scope-matchers.js'

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

/** Load scope matcher metadata from the repository's existing commitlint config. */
export async function loadScopePathMatchers(
    repoRoot: string,
): Promise<ScopePathMatchers> {
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

    if (!result) return DEFAULT_SCOPE_PATH_MATCHERS

    const resultConfig: unknown = result.config
    const config =
        typeof resultConfig === 'function'
            ? await (resultConfig as () => unknown)()
            : await resultConfig

    return scopeMatchersFromCommitlintConfig(config)
}

export default loadScopePathMatchers
