import { type Config, defineConfig, type Plugin } from '@eslint/config-helpers'
import eslintCommentsPlugin from '@eslint-community/eslint-plugin-eslint-comments'
import vitestPlugin from '@vitest/eslint-plugin'
import checkFilePlugin from 'eslint-plugin-check-file'
import importPlugin from 'eslint-plugin-import-x'
import jsdocPlugin from 'eslint-plugin-jsdoc'
import _reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import sortPlugin from 'eslint-plugin-sort'
import unusedImports from 'eslint-plugin-unused-imports'
import tsEslint from 'typescript-eslint'

/**
 * Eslint-plugin-react-hooks has a `configs.flat` shape that is incompatible with the Plugin type. Strip it down to only
 * meta + rules so TypeScript is happy.
 */
const reactHooks: Plugin = {
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
                ['unused-imports']: unusedImports,
                ['vitest']: vitestPlugin,
            },
        },
    ])

export default pluginsConfig
