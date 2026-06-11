export type ConfigApi<
    TConfig,
    TOptions extends object = object,
    TExtras extends object = object,
> = TExtras & {
    config: (options?: TOptions) => TConfig
    defineConfig: DefineConfig<TConfig>
}

/**
 * Shared "define config" identity helper and the common adapter shape every tool namespace (`Prettier`, `EsLint`,
 * `Markdownlint`, `Commitlint`) implements.
 */
export type DefineConfig<TConfig> = <const TValue extends TConfig>(
    config: TValue,
) => TValue

/** Identity helper: returns the config unchanged, narrowing to a `const` literal type for editor autocomplete. */
export const defineConfig = <const TConfig>(config: TConfig): TConfig => config
