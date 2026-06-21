/**
 * TypeDoc Configuration
 *
 * @see [TypeDoc - Documentation Generator for TypeScript Projects](https://typedoc.org/)
 */
import type { Merge } from 'type-fest'
import type { PluginOptions as MarkdownPluginOptions } from 'typedoc-plugin-markdown'
import {
    buildFunctionTypedocMarkdown,
    buildFunctionTypedocVitepress,
    type RemarkPluginOptions,
} from './markdown.js'
import type { TypedocConfigFunctionOptions } from './shared.js'
import {
    buildFunctionTypedoc,
    buildFunctionTypedocMaterialTheme,
    type MaterialThemeOptions,
    type TypedocConfig,
} from './standard.js'
import {
    type ConfigTool,
    type ConfigToolApi,
    defineConfig,
    defineConfigTool,
    type IdentityDefineConfig,
} from '../core/index.js'

type TypedocMarkdownConfigFunctionOptions =
    TypedocConfigFunctionOptions<TypedocMarkdownPluginOptions>
type TypedocMarkdownPluginOptions = Merge<
    MarkdownPluginOptions,
    RemarkPluginOptions
>
type TypedocMaterialThemeConfigFunctionOptions =
    TypedocConfigFunctionOptions<MaterialThemeOptions>

const defineTypedocConfig = <const TConfig extends TypedocConfig>(
    config: TConfig,
): TConfig => defineConfig(config)

export const Typedoc = defineConfigTool({
    config: buildFunctionTypedoc,
    defineConfig: defineTypedocConfig,
    markdown: {
        config: buildFunctionTypedocMarkdown,
    },
    materialTheme: {
        config: buildFunctionTypedocMaterialTheme,
    },
    vitepress: {
        config: buildFunctionTypedocVitepress,
    },
} satisfies ConfigToolApi<
    TypedocConfig,
    TypedocConfigFunctionOptions,
    IdentityDefineConfig<TypedocConfig>,
    {
        markdown: { config: typeof buildFunctionTypedocMarkdown }
        materialTheme: { config: typeof buildFunctionTypedocMaterialTheme }
        vitepress: { config: typeof buildFunctionTypedocVitepress }
    }
>)

export type TypedocTool = ConfigTool<
    TypedocConfig,
    TypedocConfigFunctionOptions,
    typeof Typedoc.defineConfig,
    Omit<typeof Typedoc, 'config' | 'defineConfig'>
>

export const typedoc = Typedoc

export type { RemarkPluginOptions, TypedocMarkdownOptions } from './markdown.js'
export type {
    TypedocConfigFunction,
    TypedocConfigFunctionOptions,
    TypedocFileOptions,
    TypedocOptions,
} from './shared.js'
export type { MaterialThemeOptions, TypedocConfig } from './standard.js'

export type {
    TypedocMarkdownConfigFunctionOptions,
    TypedocMarkdownPluginOptions,
    TypedocMaterialThemeConfigFunctionOptions,
}
