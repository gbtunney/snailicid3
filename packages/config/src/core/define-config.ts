import { type Spread } from 'type-fest'
import { type PathRoot } from '../utilities/path.js'
import { type PlainObject } from './../utilities/types.js'
/**
 * Permissive base constraint for any `defineConfig`-style helper, including variadic tool signatures (e.g.
 * ESLint/Vite).
 */
export type AnyDefineConfig = (...args: ReadonlyArray<any>) => unknown

export type ConfigCwd = PathRoot

export type BaseConfigFunctionOptions<CwdRequired extends boolean = false> =
    CwdRequired extends true
        ? {
              /** Root directory used for repo-relative path resolution. */
              cwd: ConfigCwd
          }
        : {
              /** Root directory used for repo-relative path resolution. Defaults to `process.cwd()`. */
              cwd?: ConfigCwd
          }
/** The `config` builder function shape shared by every tool namespace. */
export type ConfigBuilder<TConfig, TInput extends object = object> = (
    input?: TInput,
) => TConfig

export type ConfigFunctionOptions<
    ConfigOptions extends PlainObject = PlainObject,
    CwdRequired extends boolean = false,
> = Spread<BaseConfigFunctionOptions<CwdRequired>, ConfigOptions>

export type ConfigTool<
    TConfig extends object,
    TFunctionOptions extends object = ConfigFunctionOptions,
    TDefineConfig extends AnyDefineConfig = IdentityDefineConfig<TConfig>,
    TExtras extends object = object,
> = {
    api: ConfigToolApi<TConfig, TFunctionOptions, TDefineConfig, TExtras>
    config: TConfig
    options: TFunctionOptions
}

/**
 * Adapter shape every tool namespace (`Prettier`, `EsLint`, `Markdownlint`, `Commitlint`) implements.
 *
 * `TDefineConfig` accepts any valid `defineConfig`-style helper — identity for most tools, or the tool's own variadic
 * signature (e.g. ESLint/Vite).
 */
export type ConfigToolApi<
    TConfig extends object,
    TInput extends object = object,
    TDefineConfig extends AnyDefineConfig = IdentityDefineConfig<TConfig>,
    TExtras extends object = object,
> = TExtras & {
    config: ConfigBuilder<TConfig, TInput>
    defineConfig: TDefineConfig
}

/** Typed identity `defineConfig` for tools where you author your own config helper. */
export type IdentityDefineConfig<TConfig> = <const TValue extends TConfig>(
    config: TValue,
) => TValue

/** Identity helper: returns the config unchanged, narrowing to a `const` literal type for editor autocomplete. */
export const defineConfig = <const TConfig>(config: TConfig): TConfig => config

/** Identity helper for declaring a tool namespace with the standard API shape. */
export const defineConfigTool = <
    const TTool extends ConfigToolApi<object, any, AnyDefineConfig>,
>(
    tool: TTool,
): TTool => tool
