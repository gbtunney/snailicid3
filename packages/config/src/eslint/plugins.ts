import eslintCommentsPlugin from '@eslint-community/eslint-plugin-eslint-comments'
import { type Config, defineConfig, type Plugin as EslintPlugin } from '@eslint/config-helpers'
import vitestPlugin from '@vitest/eslint-plugin'
import checkFilePlugin from 'eslint-plugin-check-file'
import importPlugin from 'eslint-plugin-import-x'
import jsdocPlugin from 'eslint-plugin-jsdoc'
import reactPlugin from 'eslint-plugin-react'
import _reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import unicornPlugin from 'eslint-plugin-unicorn'
import unusedImports from 'eslint-plugin-unused-imports'
import tsEslint from 'typescript-eslint'

/**
 * Eslint-plugin-react-hooks has a `configs.flat` shape that is incompatible with the Plugin type. Strip it down to only
 * meta + rules so TypeScript is happy.
 */
const reactHooks: EslintPlugin = {
    meta: _reactHooks.meta,
    rules: _reactHooks.rules,
}

type EslintPluginEntry<TName extends string = string> = readonly [
    name: TName,
    plugin: EslintPlugin,
]

export const definePlugins = <const TEntries extends ReadonlyArray<EslintPluginEntry>>(
    entries: TEntries,
): {
    [TEntry in TEntries[number] as TEntry[0]]: TEntry[1]
} =>
    Object.fromEntries(entries) as {
        [TEntry in TEntries[number] as TEntry[0]]: TEntry[1]
    }

export const getBuiltInPlugins = (): Array<Config> =>
    defineConfig([
        {
            name: 'Custom Base Configuration : Included plugins',
            plugins: {
                ['@typescript-eslint']: tsEslint.plugin,
                ['check-file']: checkFilePlugin,
                ['eslint-comments']: eslintCommentsPlugin,
                ['import']: importPlugin,
                ['jsdoc']: jsdocPlugin,
                ['react']: reactPlugin,
                ['react-hooks']: reactHooks,
                ['react-refresh']: reactRefresh,
                ['unicorn']: unicornPlugin,
                ['unused-imports']: unusedImports,
                ['vitest']: vitestPlugin,
            },
        },
    ])

export default pluginsConfig
