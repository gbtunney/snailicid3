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

export type PrettierConfig = Merge<
    Merge<Config, PrettierOptions>,
    {
        overrides: PrettierOverrides
    }
>

export type PrettierOptions = JsDocOptions & Options
export type PrettierOverrides = Array<
    Merge<IterableElement<Config['overrides']>, { options: PrettierOptions }>
>

//SHARED_FORMATTING_RULES.tabWidth,

export const prettierConfiguration = (
    isBundled: boolean = true,
    _options?: PrettierOptions,
    _overrides?: PrettierOverrides,
): PrettierConfig => {
    const defaultOverrides = getDefaultOverrides()
    const defaultOptions = getDefaultOptions()
    const myoption: PrettierOptions =
        _options !== undefined
            ? { ...defaultOptions, ..._options }
            : defaultOptions

    const __overrides: PrettierOverrides =
        _overrides !== undefined
            ? [...defaultOverrides, ..._overrides]
            : [...defaultOverrides]
    return {
        ...myoption,
        overrides: __overrides, //(overrides !== undefined ? { overrides } : []),
        plugins: [
            ...(isBundled
                ? getPrettierPluginsBundled()
                : getPrettierPluginsList()),
        ],
    }
}
/** @ignore */
export const Prettier: {
    config: PrettierConfig
    configuration: typeof prettierConfiguration
    options: PrettierOptions
} = {
    config: prettierConfiguration(),
    configuration: prettierConfiguration,
    options: getDefaultOptions(),
}

export { getScaledWidth, SHARED_FORMATTING_RULES } from '../shared.js'
