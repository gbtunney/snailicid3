/**
 * Prettier Configuration
 *
 * @see [Prettier - Opinionated Code Formatter](https://prettier.io/)
 */
import { type Config, type Options } from 'prettier'
import type { Options as JsDocOptions } from 'prettier-plugin-jsdoc'
import type { IterableElement, Merge } from 'type-fest'
import { getDefaultOptions, getDefaultOverrides } from './options.js'
import { getPrettierPluginsBundled, getPrettierPluginsList } from './plugins.js'
import {
    type ConfigToolApi,
    type IdentityDefineConfig,
    defineConfig, ConfigFunctionOptions
} from '../core/define-config.js'

export const BASE_IGNORES = ['**/*.api.md', 'tmp', 'temp'] as const

export type PrettierConfig = Merge<
    Merge<Config, PrettierOptions>,
    {
        overrides: PrettierOverrides
    }
>
export type PrettierConfigFunctionOptions = ConfigFunctionOptions<{
    /** Reserved for future path-relative resolution. Defaults to `process.cwd()`. */
    cwd?: string
    /** Bundle plugin objects directly (default) vs. plugin package-name strings only. */
    isBundled?: boolean
    /** Shallow-merged on top of `Prettier.options.base()` (caller keys win). */
    options?: PrettierOptions
    /** Appended after `Prettier.overrides.base()` (array concat). */
    overrides?: PrettierOverrides
}>
export type PrettierOptions = JsDocOptions & Options

export type PrettierOverrides = Array<
    Merge<IterableElement<Config['overrides']>, { options: PrettierOptions }>
>

/**
 * Builds the recommended Prettier config.
 *
 * - `options`: shallow-merged on top of `Prettier.options.base()` (caller keys win).
 * - `overrides`: appended after `Prettier.overrides.base()` (array concat, no per-`files` merge).
 * - `isBundled`: selects resolved plugin objects (default) vs. plugin package-name strings.
 * - `cwd`: reserved for future use; currently unused.
 */
const buildPrettierConfig = ({
    isBundled = true,
    options,
    overrides,
}: PrettierConfigFunctionOptions = {}): PrettierConfig => {
    const defaultOptions = getDefaultOptions()
    const defaultOverrides = getDefaultOverrides()

    return {
        ...(options !== undefined
            ? { ...defaultOptions, ...options }
            : defaultOptions),
        overrides:
            overrides !== undefined
                ? [...defaultOverrides, ...overrides]
                : [...defaultOverrides],
        plugins: [
            ...(isBundled
                ? getPrettierPluginsBundled()
                : getPrettierPluginsList()),
        ],
    }
}

export const Prettier = {
    config: buildPrettierConfig,
    defineConfig,
    options: { base: getDefaultOptions },
    overrides: { base: getDefaultOverrides },
    plugins: {
        bundled: getPrettierPluginsBundled,
        list: getPrettierPluginsList,
    },
} satisfies ConfigToolApi<
    PrettierConfig,
    PrettierConfigFunctionOptions,
    IdentityDefineConfig<PrettierConfig>,
    {
        options: { base: typeof getDefaultOptions }
        overrides: { base: typeof getDefaultOverrides }
        plugins: {
            bundled: typeof getPrettierPluginsBundled
            list: typeof getPrettierPluginsList
        }
    }
>

export { getScaledWidth, SHARED_FORMATTING_RULES } from '../shared.js'
