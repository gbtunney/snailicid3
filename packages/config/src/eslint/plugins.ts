import eslintCommentsPlugin from '@eslint-community/eslint-plugin-eslint-comments'
import simpleFilenamesPlugin from 'eslint-plugin-filenames-simple'
import importPlugin from 'eslint-plugin-import'
import jsdocPlugin from 'eslint-plugin-jsdoc'
import sortPlugin from 'eslint-plugin-sort'
import unusedImports from 'eslint-plugin-unused-imports'
import vitestPlugin from '@vitest/eslint-plugin'
import checkFilePlugin from 'eslint-plugin-check-file'
import _reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, type Config, type Plugin } from '@eslint/config-helpers'
import tsEslint from 'typescript-eslint'

/**
 * Eslint-plugin-react-hooks has a `configs.flat` shape that is incompatible with the Plugin type. Strip it down to only
 * meta + rules so TypeScript is happy.
 */
const reactHooks: Plugin = {
    meta: _reactHooks.meta,
    rules: _reactHooks.rules,
}

export const pluginsConfig = (): Config[] =>
    defineConfig([
        {
            name: 'Custom Base Configuration : Included plugins',
            plugins: {
                ['@typescript-eslint']: tsEslint.plugin,
                ['check-file']: checkFilePlugin,
                ['eslint-comments']: eslintCommentsPlugin,
                ['filenames-simple']: simpleFilenamesPlugin,
                ['import']: importPlugin,
                ['jsdoc']: jsdocPlugin,
                ['react-hooks']: reactHooks,
                ['react-refresh']: reactRefresh,
                ['sort']: sortPlugin,
                ['unused-imports']: unusedImports,
                ['vitest']: vitestPlugin,
            },
        },
    ])

export default pluginsConfig
