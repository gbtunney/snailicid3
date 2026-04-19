/** PLUGIN REGISTRY */
import {
    type Config,
    defineConfig,
    Plugin as EslintPlugin,
} from '@eslint/config-helpers'
import eslintCommentsPlugin from '@eslint-community/eslint-plugin-eslint-comments'
import vitestPlugin from '@vitest/eslint-plugin'
import checkFilePlugin from 'eslint-plugin-check-file'
import importPlugin from 'eslint-plugin-import'
import jsdocPlugin from 'eslint-plugin-jsdoc'
import _reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import sortPlugin from 'eslint-plugin-sort'
import unicornPlugin from 'eslint-plugin-unicorn'
import unusedImports from 'eslint-plugin-unused-imports'
//import type { Config } from 'typescript-eslint'
import tsEslint from 'typescript-eslint'

/**
 * This canot use a function to create the plugin config because of the way eslint expects plugins to be defined. so
 * annoying
 */

const reactHooks: EslintPlugin = {
    meta: _reactHooks.meta,
    rules: _reactHooks.rules,
}

export const pluginsConfig = (): Array<Config> =>
    defineConfig([
        {
            name: 'Custom Base Configuration : Included plugins',
            plugins: {
                ['@typescript-eslint']: tsEslint.plugin,
                ['check-file']: checkFilePlugin,
                ['eslint-comments']: eslintCommentsPlugin,

                ['import']: importPlugin,
                ['jsdoc']: jsdocPlugin,
                ['react-hooks']: reactHooks,
                ['react-refresh']: reactRefresh,
                ['sort']: sortPlugin,
                ['unicorn']: unicornPlugin,
                ['unused-imports']: unusedImports,
                ['vitest']: vitestPlugin,
            },
        },
    ])

export default pluginsConfig
