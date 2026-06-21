import { merge as deepmerge } from 'ts-deepmerge'
import {
    getDefaultTypedocPluginNames,
    getTypedocMaterialThemePluginNames,
} from './plugins/index.js'
import { fileSharedOptions, resolveTypedocConfigInput } from './shared.js'
import type { TypedocConfigFunction, TypedocOptions } from './shared.js'

export type MaterialThemeOptions = {
    themeColor?: string
}
export type TypedocConfig = TypedocOptions

export const buildFunctionTypedoc: TypedocConfigFunction = (input = {}) => {
    const { dirname, overrides } = resolveTypedocConfigInput(input)
    const fileOptions = fileSharedOptions(dirname)
    const options: TypedocOptions = {
        ...fileOptions,
        excludeExternals: false,
        plugin: getDefaultTypedocPluginNames(),
    }
    return deepmerge(options, overrides)
}

export const buildFunctionTypedocMaterialTheme: TypedocConfigFunction<
    MaterialThemeOptions
> = (input = {}) => {
    const { overrides } = resolveTypedocConfigInput(input)
    const standardConfig = buildFunctionTypedoc(input)
    const options: TypedocOptions<MaterialThemeOptions> = {
        ...standardConfig,
        plugin: getTypedocMaterialThemePluginNames(),
        themeColor: '#cb9820',
    }
    return deepmerge(options, overrides)
}

export default buildFunctionTypedoc
