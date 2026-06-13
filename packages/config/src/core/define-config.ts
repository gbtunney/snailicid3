
import {PlainObject} from './../utilities/json.js'
import {Merge}from 'type-fest'
type BaseConfigFunctionOptions = {
 /** Reserved for future workspace-discovery cwd support. Defaults to `process.cwd()`. */
    cwd?: string
}
export type ConfigFunctionOptions<ConfigOptions extends PlainObject=PlainObject> = Merge<BaseConfigFunctionOptions, ConfigOptions>
/** Typed identity `defineConfig` for tools where you author your own config helper. */
export type IdentityDefineConfig<TConfig> = <const TValue extends TConfig>(
    config: TValue,
) => TValue

/** Permissive base constraint for any `defineConfig`-style helper, including variadic tool signatures (e.g. ESLint/Vite). */
export type AnyDefineConfig = (...args: ReadonlyArray<any>) => unknown

/** The `config` builder function shape shared by every tool namespace. */
export type ConfigBuilder<TConfig, TInput extends object = object> = (
    input?: TInput,
) => TConfig

/**
 * Adapter shape every tool namespace (`Prettier`, `EsLint`, `Markdownlint`, `Commitlint`) implements.
 *
 * `TDefineConfig` accepts any valid `defineConfig`-style helper — identity for most tools,
 * or the tool's own variadic signature (e.g. ESLint/Vite).
 */
export type ConfigToolApi<
    TConfig,
    TInput extends object = object,
    TDefineConfig extends AnyDefineConfig = IdentityDefineConfig<TConfig>,
    TExtras extends object = object,
> = {
    defineConfig: TDefineConfig
    config: ConfigBuilder<TConfig, TInput>
} & TExtras

/** Identity helper: returns the config unchanged, narrowing to a `const` literal type for editor autocomplete. */
export const defineConfig = <const TConfig>(config: TConfig): TConfig => config
