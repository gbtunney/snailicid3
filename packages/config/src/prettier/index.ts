/**
 * Prettier Configuration
 *
 * @see [Prettier - Opinionated Code Formatter](https://prettier.io/)
 */
import { type Config, type Options } from 'prettier'
import type { Options as JsDocOptions } from 'prettier-plugin-jsdoc'
import type { IterableElement, Merge, OmitIndexSignature } from 'type-fest'
import { getDefaultOptions, getDefaultOverrides } from './options.js'
import { getPrettierPluginsBundled, getPrettierPluginsList } from './plugins.js'
export const BASE_IGNORES = ['**/*.api.md', 'tmp', 'temp'] as const

export type PrettierConfig = Merge<
    Merge<Config, PrettierOptions>,
    {
        overrides: PrettierOverrides
    }
>
type PrettierOptionsStrict = OmitIndexSignature<Options>

const definePrettierConfig = <Type extends PrettierConfig>(
    config: Type,
): Type => config

export default definePrettierConfig({
    overrides: [],
    plugins: [],
    semi: true,
    singleQuote: true,
})

export type PrettierOptions = JsDocOptions & Options
export type PrettierOverrides = Array<
    Merge<IterableElement<Config['overrides']>, { options: PrettierOptions }>
>

/**
 * TODO: update language and order for these options. technically 'options' is means 'override options' and 'overrrudes'
 * means to append to the default overrides, but this is not clear. maybe 'baseOptions' and 'additionalOverrides' or
 * something like that? also, should we have a separate function for getting the default config and then a function for
 * merging with custom options? or should we just have one function that does both? maybe we can have a function that
 * returns the default config and then another function that takes custom options and merges them with the default
 * config? this way we can have more control over how the merging is done and we can also have more flexibility in terms
 * of how the options are structured. just some thoughts.
 */
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

//todo get rid of this wierd function call?  reorder the properties?  prettierConfiguration(), should be get default config?
//improvements
/** @ignore */
export const Prettier: {
    config: PrettierConfig
    configuration: typeof prettierConfiguration
    defineConfig: typeof definePrettierConfig
    options: PrettierOptions
} = {
    config: prettierConfiguration(),
    configuration: prettierConfiguration,
    //TODO pls ensure it is clear this will be returning ,lets upfate to use same struct as eslint
    //added defineConfig
    /*export const EsLint: {
        config: typeof flatEslintConfig
        defineConfig: typeof defineConfig
    } = {
        config: flatEslintConfig,
        defineConfig,
    }*/
    defineConfig: definePrettierConfig,
    options: getDefaultOptions(),
}

export { getScaledWidth, SHARED_FORMATTING_RULES } from '../shared.js'
