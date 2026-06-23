import { merge as deepmerge } from 'ts-deepmerge'
import type { Merge } from 'type-fest'
import { type ReflectionKind } from 'typedoc'
import { type PluginOptions as MarkdownPluginOptions } from 'typedoc-plugin-markdown'

import {
    getTypedocMarkdownPluginNames,
    getTypedocRemarkPluginNames,
    getTypedocVitepressPluginNames,
} from './plugins/index.js'
import {
    fileSharedOptions,
    resolveTypedocConfigInput,
    type TypedocConfigFunction,
    type TypedocConfigFunctionOptions,
    type TypedocOptions,
} from './shared.js'
import { defineConfigBuilder } from '../core/index.js'
export type RemarkPluginOptions = {
    /** An array of remark plugin names. */

    /** |Record<string, unknown>; */
    remarkPlugins?: unknown

    /** Custom options for the remark-stringify plugin. */
    remarkStringifyOptions?: unknown
}
export type TypedocMarkdownOptions = TypedocOptions<
    Merge<MarkdownPluginOptions, RemarkPluginOptions>
>

const markdownBase = (): TypedocMarkdownOptions => {
    const options: TypedocMarkdownOptions = {
        categorizeByGroup: true,

        /** Typedoc-plugin-markdown formats */
        enumMembersFormat: 'table',

        /** Exclusions */
        excludeExternals: false,

        excludeInternal: true,
        excludeReferences: false,
        expandObjects: true,
        groupOrder: SORT_ORDER,
        includeVersion: true,
        indexFormat: 'table',

        /** Sort order */
        kindSortOrder: SORT_ORDER,
        mergeReadme: true,
        outputFileStrategy: 'members',

        parametersFormat: 'table',

        /** Typedoc Plugins */
        plugin: getTypedocMarkdownPluginNames(),
        propertiesFormat: 'table',
        sanitizeComments: true,
        sort: ['kind', 'source-order'],
        typeDeclarationFormat: 'table',

        useCodeBlocks: true,
    }
    return options
}
const SORT_ORDER: Array<ReflectionKind.KindString> = [
    'Module',
    'Namespace',
    'Function',
    'Variable',
    'TypeAlias',
    'Enum',
    'EnumMember',
    'Parameter',
    'TypeParameter',
    'TypeLiteral',
    'IndexSignature',
    'Property',
    'Accessor',
    'Method',
    'Class',
    'Interface',
    'Constructor',
    'Reference',
    'Project',
    'CallSignature',
    'ConstructorSignature',
    'GetSignature',
    'SetSignature',
]
const enableRemarkPlugins = (
    prettier: boolean = true,
    toc: boolean = true,
    maxDepth: number = 3,
): TypedocMarkdownOptions => {
    return prettier || toc
        ? {
              plugin: getTypedocRemarkPluginNames(),
              remarkPlugins: [
                  ...(prettier ? ['unified-prettier'] : []),
                  ...(toc ? [['remark-toc', { maxDepth }]] : []),
              ],
          }
        : {}
}

/** Typedoc-plugin-markdown is required */
export const buildFunctionTypedocMarkdown: TypedocConfigFunction<
    Merge<MarkdownPluginOptions, RemarkPluginOptions>
> = defineConfigBuilder<
    TypedocMarkdownOptions,
    TypedocConfigFunctionOptions<Merge<MarkdownPluginOptions, RemarkPluginOptions>>
>((input) => {
    const { dirname, overrides } = resolveTypedocConfigInput(input)
    const fileOptions = fileSharedOptions(dirname)

    const options: TypedocMarkdownOptions = deepmerge(
        {
            ...fileOptions,
            ...markdownBase(),
        },
        enableRemarkPlugins(true, true),
    )
    return deepmerge(options, overrides)
})

export const buildFunctionTypedocVitepress: TypedocConfigFunction<
    Merge<MarkdownPluginOptions, RemarkPluginOptions>
> = defineConfigBuilder<
    TypedocMarkdownOptions,
    TypedocConfigFunctionOptions<Merge<MarkdownPluginOptions, RemarkPluginOptions>>
>((input) => {
    const { dirname, overrides } = resolveTypedocConfigInput(input)
    const fileOptions = fileSharedOptions(dirname)

    const options: TypedocMarkdownOptions = deepmerge(
        {
            ...fileOptions,
            ...markdownBase(),
            ...enableRemarkPlugins(false, false),
        },
        { plugin: getTypedocVitepressPluginNames() },
    )
    return deepmerge(options, overrides)
})
export default buildFunctionTypedocMarkdown
