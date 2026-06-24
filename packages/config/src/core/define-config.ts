import { type Spread } from 'type-fest'
import { type PlainObject } from './../utilities/types.js'
import { type PathRoot, resolveCwd } from '../utilities/path.js'
/**
 * Permissive base constraint for any `defineConfig`-style helper, including variadic tool signatures (e.g.
 * ESLint/Vite).
 */
export type AnyDefineConfig = (...args: ReadonlyArray<any>) => unknown

export type BaseConfigFunctionOptions = {
    /** Root directory used for repo-relative path resolution. */
    cwd: ConfigCwd
}
/** The `config` builder function shape shared by every tool namespace. */
export type ConfigBuilder<
    TConfig,
    TInput extends BaseConfigFunctionOptions = BaseConfigFunctionOptions,
> = (input: TInput) => TConfig

export type ConfigBuilderImplementation<
    TConfig,
    TInput extends BaseConfigFunctionOptions,
> = (input: ResolvedConfigFunctionOptions<TInput>) => TConfig

export type ConfigCwd = PathRoot
export type ConfigFunctionOptions<
    ConfigOptions extends PlainObject = PlainObject,
> = Spread<BaseConfigFunctionOptions, ConfigOptions>

export type ConfigTool<
    TConfig extends object,
    TFunctionOptions extends BaseConfigFunctionOptions =
        BaseConfigFunctionOptions,
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
    TInput extends BaseConfigFunctionOptions = BaseConfigFunctionOptions,
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

export type ResolvedBaseConfigFunctionOptions = {
    /** Normalized absolute root directory used internally by config builders. */
    cwd: ResolvedConfigCwd
}

export type ResolvedConfigCwd = string

export type ResolvedConfigFunctionOptions<
    TInput extends BaseConfigFunctionOptions,
> = Omit<TInput, 'cwd'> & ResolvedBaseConfigFunctionOptions

/** Identity helper: returns the config unchanged, narrowing to a `const` literal type for editor autocomplete. */
export const defineConfig = <const TConfig>(config: TConfig): TConfig => config

export const defineConfigBuilder = <
    TConfig,
    const TInput extends BaseConfigFunctionOptions,
>(
    builder: ConfigBuilderImplementation<TConfig, TInput>,
): ConfigBuilder<TConfig, TInput> => {
    return (input: TInput): TConfig => {
        const resolvedInput = {
            ...input,
            cwd: resolveCwd(input.cwd),
        } as ResolvedConfigFunctionOptions<TInput>

        return builder(resolvedInput)
    }
}

/** Identity helper for declaring a tool namespace with the standard API shape. */
export const defineConfigTool = <
    const TTool extends ConfigToolApi<
        object,
        BaseConfigFunctionOptions,
        AnyDefineConfig
    >,
>(
    tool: TTool,
): TTool => tool
