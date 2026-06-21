import * as phpPlugin from '@prettier/plugin-php'
import xmlPlugin from '@prettier/plugin-xml'
import { type Plugin as PrettierPlugin } from 'prettier'
import * as unResolvedJsdocPlugin from 'prettier-plugin-jsdoc'
import * as shPlugin from 'prettier-plugin-sh'
import type { UnknownRecord } from 'type-fest'
import {
    definePrettierPluginRegistry,
    type ResolvedPrettierPlugin,
    resolvePrettierPlugin,
    resolvePrettierPluginRegistry,
} from './registry.js'

type UnresolvedPrettierPlugin<Type extends PrettierPlugin = PrettierPlugin> =
    | Type
    | { default: Type }

const jsDocPlugin: UnresolvedPrettierPlugin = {
    ...unResolvedJsdocPlugin,
    defaultOptions: { ...unResolvedJsdocPlugin.defaultOptions },
    options: unResolvedJsdocPlugin.options,
}

type KeysOf<ObjectType> = Extract<keyof ObjectType, string>
export const keysOf = <ObjectType extends UnknownRecord>(
    obj: ObjectType,
): Array<KeysOf<ObjectType>> => Object.keys(obj) as Array<KeysOf<ObjectType>>

export const PRETTIER_PLUGINS = definePrettierPluginRegistry({
    '@prettier/plugin-php': resolvePrettierPlugin(phpPlugin),
    '@prettier/plugin-xml': resolvePrettierPlugin(xmlPlugin),
    'prettier-plugin-jsdoc': resolvePrettierPlugin(jsDocPlugin),
    'prettier-plugin-sh': resolvePrettierPlugin(shPlugin),
})

export type PrettierPluginName =
    | '@prettier/plugin-php'
    | '@prettier/plugin-xml'
    | 'prettier-plugin-jsdoc'
    | 'prettier-plugin-sh'

export const getDefaultPrettierPlugins = (): Array<
    PrettierPluginName | ResolvedPrettierPlugin
> => {
    return resolvePrettierPluginRegistry(PRETTIER_PLUGINS) as Array<
        PrettierPluginName | ResolvedPrettierPlugin
    >
}

export const getDefaultPrettierPluginNames = (): Array<PrettierPluginName> => {
    const plugins = PRETTIER_PLUGINS as Record<
        PrettierPluginName,
        boolean | ResolvedPrettierPlugin
    >

    return keysOf(plugins).filter((pluginName) => plugins[pluginName] !== false)
}

export const DEFAULT_PRETTIER_PLUGIN_LIST: Array<PrettierPluginName> =
    getDefaultPrettierPluginNames()
