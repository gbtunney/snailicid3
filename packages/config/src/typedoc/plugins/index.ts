import type { UnknownRecord } from 'type-fest'
import {
    defineTypedocPluginRegistry,
    resolveTypedocPluginRegistry,
} from './registry.js'

type KeysOf<ObjectType> = Extract<keyof ObjectType, string>
const keysOf = <ObjectType extends UnknownRecord>(
    obj: ObjectType,
): Array<KeysOf<ObjectType>> => Object.keys(obj) as Array<KeysOf<ObjectType>>

export const TYPEDOC_PLUGINS = defineTypedocPluginRegistry({
    'typedoc-material-theme': true,
    'typedoc-plugin-markdown': true,
    'typedoc-plugin-remark': true,
    'typedoc-plugin-zod': true,
    'typedoc-vitepress-theme': true,
})

export type TypedocPluginName = KeysOf<typeof TYPEDOC_PLUGINS>

const toPluginNames = (
    plugins: Partial<Record<TypedocPluginName, true>>,
): Array<TypedocPluginName> => {
    return resolveTypedocPluginRegistry(plugins).filter((pluginName) => {
        return keysOf(TYPEDOC_PLUGINS).includes(pluginName as TypedocPluginName)
    }) as Array<TypedocPluginName>
}

export const getDefaultTypedocPluginNames = (): Array<TypedocPluginName> =>
    toPluginNames({ 'typedoc-plugin-zod': true })

export const getTypedocMarkdownPluginNames = (): Array<TypedocPluginName> =>
    toPluginNames({
        'typedoc-plugin-markdown': true,
        'typedoc-plugin-zod': true,
    })

export const getTypedocMaterialThemePluginNames =
    (): Array<TypedocPluginName> =>
        toPluginNames({
            'typedoc-material-theme': true,
            'typedoc-plugin-zod': true,
        })

export const getTypedocRemarkPluginNames = (): Array<TypedocPluginName> =>
    toPluginNames({ 'typedoc-plugin-remark': true })

export const getTypedocVitepressPluginNames = (): Array<TypedocPluginName> =>
    toPluginNames({ 'typedoc-vitepress-theme': true })
