import type { Plugin as PrettierPlugin } from 'prettier'

declare const RESOLVED_PRETTIER_PLUGIN: unique symbol

export type PrettierPluginPackageName =
    | `@prettier/${string}`
    | `prettier-plugin-${string}`

export type PrettierPluginRegistry = Partial<
    Record<PrettierPluginPackageName, PrettierPluginRegistryEntry>
>

export type PrettierPluginRegistryEntry = false | ResolvedPrettierPlugin | true

export type ResolvedPrettierPlugin = PrettierPlugin & {
    readonly [RESOLVED_PRETTIER_PLUGIN]: true
}

type StrictPrettierPluginRegistry<
    TPlugins extends Record<string, PrettierPluginRegistryEntry>,
> = Record<Exclude<keyof TPlugins, PrettierPluginPackageName>, never> & TPlugins

type UnresolvedPrettierPlugin<TPlugin extends PrettierPlugin = PrettierPlugin> =
    | TPlugin
    | { default: TPlugin }

export const resolvePrettierPlugin = (
    moduleValue: UnresolvedPrettierPlugin,
): ResolvedPrettierPlugin => {
    const plugin = 'default' in moduleValue ? moduleValue.default : moduleValue

    return plugin as ResolvedPrettierPlugin
}

export const definePrettierPluginRegistry = <
    const TPlugins extends Record<string, PrettierPluginRegistryEntry>,
>(
    plugins: StrictPrettierPluginRegistry<TPlugins>,
): TPlugins => plugins

export const resolvePrettierPluginRegistry = (
    plugins: PrettierPluginRegistry,
): Array<PrettierPluginPackageName | ResolvedPrettierPlugin> => {
    return Object.entries(plugins).flatMap(
        ([name, plugin]): Array<
            PrettierPluginPackageName | ResolvedPrettierPlugin
        > => {
            if (plugin === false || plugin === undefined) {
                return []
            }

            if (plugin === true) {
                return [name as PrettierPluginPackageName]
            }

            return [plugin]
        },
    )
}
