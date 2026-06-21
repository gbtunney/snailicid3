import { merge as deepmerge } from 'ts-deepmerge'
import { type TypeDocOptions } from 'typedoc'
import { fileSharedOptions } from './shared.js'
import type { TypedocConfigFunction, TypedocOptions } from './shared.js'

export type MaterialThemeOptions = {
    themeColor?: string
}
export type TypedocConfig = Partial<TypeDocOptions>

export const config: TypedocConfigFunction = (__dirname, _options) => {
    const _fileOptions: TypedocOptions | undefined =
        fileSharedOptions(__dirname)
    const options_to_merge: TypedocOptions =
        _options !== undefined ? _options : {}

    if (_fileOptions !== undefined) {
        const fileOptions = _fileOptions
        const options: TypedocOptions = {
            ...fileOptions,
            excludeExternals: false,
            plugin: ['typedoc-plugin-zod'],
        }
        const mergedOptions: TypedocOptions = deepmerge(
            options,
            options_to_merge,
        )
        return mergedOptions
    }
    return undefined
}

export const materialTheme: TypedocConfigFunction<MaterialThemeOptions> = (
    __dirname: string,
    _options,
) => {
    const options_to_merge: TypedocOptions<MaterialThemeOptions> =
        _options !== undefined ? _options : {}

    const standardConfig: TypedocOptions | undefined = config(__dirname)
    if (standardConfig !== undefined) {
        const options: TypedocOptions<MaterialThemeOptions> = {
            ...standardConfig,
            plugin: ['typedoc-material-theme', 'typedoc-plugin-zod'],
            themeColor: '#cb9820',
        }
        const mergedOptions: TypedocOptions = deepmerge(
            options,
            options_to_merge,
        )
        return mergedOptions
    }
    return undefined
}

export default config
