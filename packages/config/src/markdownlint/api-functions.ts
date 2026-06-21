import { getMergedRuleConfiguration } from './rules.js'
import type {
    MarkdownlintConfiguration,
    MarkdownlintRuleConfiguration,
} from './schema.js'
import { type ConfigFunctionOptions, defineConfig } from '../core/index.js'

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

export type MarkdownlintConfig = MarkdownlintConfiguration

export type MarkdownlintConfigFunctionOptions = ConfigFunctionOptions<{
    /** Appended to `BASE_IGNORES`. */
    ignores?: Array<string>
    /** Replaces the default `['**\/*.md']` glob list if provided. */
    includes?: Array<string>
    /** Merged onto `Markdownlint.rules.base()` when `useBaseConfig` is true. */
    rules?: MarkdownlintRuleConfiguration
    /** When true, merge `rules` onto the base config. */
    useBaseConfig?: boolean
}>

export const defineMarkdownlintConfig = <
    const TConfig extends MarkdownlintConfig,
>(
    config: TConfig,
): TConfig => defineConfig(config)

export const buildFunctionMarkdownlint = ({
    ignores = [],
    includes = ['**/*.md'],
    rules = {},
    useBaseConfig = true,
}: MarkdownlintConfigFunctionOptions = {}): MarkdownlintConfig => ({
    config: getMergedRuleConfiguration(rules, useBaseConfig),
    globs: includes,
    ignores: [...BASE_IGNORES, ...ignores],
})
