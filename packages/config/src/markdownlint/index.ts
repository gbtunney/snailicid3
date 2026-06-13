import { getBaseConfig } from './base.config.js'
import { getMergedRuleConfiguration } from './rules.js'
import type {
    MarkdownlintConfiguration,
    MarkdownlintRuleConfiguration,
} from './schema.js'
import {
    type ConfigToolApi,
    type IdentityDefineConfig,
    defineConfig,
} from '../core/index.js'

export const BASE_IGNORES = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.history/**',
    '**/.changeset/**',
    '**/docs/**',
    '**/scratch/**',
    '**/etc/**',
    '**/tmp/**',
    '**/.github/instructions/nx.instructions.md',
]

export type MarkdownlintConfigOptions = {
    /** Reserved for future use. Defaults to `process.cwd()`. */
    cwd?: string
    /** Appended to `BASE_IGNORES` (array concat). */
    ignores?: Array<string>
    /** Replaces the default `['**\/*.md']` glob list if provided. */
    includes?: Array<string>
    /** Deep-merged onto `Markdownlint.rules.base()` via `ts-deepmerge` when `useBaseConfig` is true. */
    rules?: MarkdownlintRuleConfiguration
    /** When true (default), `rules` merges onto the base config; when false, used as-is. */
    useBaseConfig?: boolean
}

export const Markdownlint = {
    /**
     * Builds the recommended markdownlint-cli2 config object.
     *
     * - `rules`: merged onto `Markdownlint.rules.base()` (default) or used as-is when `useBaseConfig` is false.
     * - `includes`: replaces the default `['**\/*.md']` glob list if provided.
     * - `ignores`: appended to `BASE_IGNORES`.
     * - `cwd`: reserved for future use; currently unused.
     */
    config: ({
        ignores = [],
        includes = ['**/*.md'],
        rules = {},
        useBaseConfig = true,
    }: MarkdownlintConfigOptions = {}): MarkdownlintConfiguration => ({
        config: getMergedRuleConfiguration(rules, useBaseConfig),
        globs: includes,
        ignores: [...BASE_IGNORES, ...ignores],
    }),
    defineConfig,
    rules: {
        base: getBaseConfig,
        merge: getMergedRuleConfiguration,
    },
} satisfies ConfigToolApi<
    MarkdownlintConfiguration,
    MarkdownlintConfigOptions,
    IdentityDefineConfig<MarkdownlintConfiguration>,
    {
        rules: {
            base: typeof getBaseConfig
            merge: typeof getMergedRuleConfiguration
        }
    }
>

export type {
    MarkdownlintConfiguration,
    MarkdownlintRuleConfiguration,
} from './schema.js'
