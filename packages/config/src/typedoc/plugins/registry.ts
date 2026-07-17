export type TypedocPluginPackageName =
    `typedoc-${string}-theme` | `typedoc-plugin-${string}`

export type TypedocPluginRegistry = Partial<
    Record<TypedocPluginPackageName, TypedocPluginRegistryEntry>
>

export type TypedocPluginRegistryEntry = false | true

type StrictTypedocPluginRegistry<
    TPlugins extends Record<string, TypedocPluginRegistryEntry>,
> = Record<Exclude<keyof TPlugins, TypedocPluginPackageName>, never> & TPlugins

export const defineTypedocPluginRegistry = <
    const TPlugins extends Record<string, TypedocPluginRegistryEntry>,
>(
    plugins: StrictTypedocPluginRegistry<TPlugins>,
): TPlugins => plugins

export const resolveTypedocPluginRegistry = (
    plugins: TypedocPluginRegistry,
): Array<TypedocPluginPackageName> => {
    const pluginNames = Object.keys(plugins) as Array<TypedocPluginPackageName>

    return pluginNames.filter((pluginName) => plugins[pluginName] === true)
}
