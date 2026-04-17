/**
 * Prettier Configuration
 *
 * @see [Prettier - Opinionated Code Formatter](https://prettier.io/)
 */
import { Config, Options } from "prettier";
import type { Options as JsDocOptions } from "prettier-plugin-jsdoc";
import type { IterableElement, Merge } from "type-fest";
import {getDefaultOptions,getDefaultOverrides}from './options.js'
import {getPrettierPluginsBundled,getPrettierPluginsList}from './plugins.js'
import {ArrayValues}from 'type-fest'


export { getScaledWidth, SHARED_FORMATTING_RULES } from "../shared.js";

export type PrettierOptions = Options & JsDocOptions;
export type PrettierOverrides = Array<
  Merge<IterableElement<Config["overrides"]>, { options: PrettierOptions }>
>;

export type PrettierConfig = Merge<
  Merge<Config, PrettierOptions>,
  {
    overrides: PrettierOverrides;
  }
>;
    //SHARED_FORMATTING_RULES.tabWidth,
 
export const prettierConfiguration = (
  bundled:boolean = true,
  _options?: PrettierOptions,
  _overrides?: PrettierOverrides
): PrettierConfig => {

  const defaultOverrides = getDefaultOverrides()
  const defaultOptions = getDefaultOptions() 
  const myoption: PrettierOptions =
    _options !== undefined
      ? { ...defaultOptions, ..._options }
      :defaultOptions;

  const __overrides: PrettierOverrides =
    _overrides !== undefined
      ? [...defaultOverrides, ..._overrides]
      : [...defaultOverrides];
  return {
    ...myoption,
    overrides: __overrides, //(overrides !== undefined ? { overrides } : []),
    plugins: [...(bundled)? getPrettierPluginsBundled():getPrettierPluginsList()]
  };
};

/** @ignore */
export const Prettier: {
  config: PrettierConfig;
  options: PrettierOptions;
  configuration: typeof prettierConfiguration;
} = {
  config: prettierConfiguration(),
  configuration: prettierConfiguration,
  options: getDefaultOptions()
};
