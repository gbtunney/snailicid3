import { type Config, defineConfig } from '@eslint/config-helpers'
import eslintCommentsPlugin from '@eslint-community/eslint-plugin-eslint-comments'
import vitestPlugin from '@vitest/eslint-plugin'
import checkFilePlugin from 'eslint-plugin-check-file'
import importPlugin from 'eslint-plugin-import'
import jsdocPlugin from 'eslint-plugin-jsdoc'
import reactRefresh from 'eslint-plugin-react-refresh'
import sortPlugin from 'eslint-plugin-sort'
import unusedImports from 'eslint-plugin-unused-imports'
//import type { Config } from 'typescript-eslint'
import tsEslint from 'typescript-eslint'

export const pluginsConfig = (): Array<Config> =>
    defineConfig([
        {
            name: 'Custom Base Configuration : Included plugins',
            plugins: {
                ['@typescript-eslint']: tsEslint.plugin,
                ['check-file']: checkFilePlugin,
                ['eslint-comments']: eslintCommentsPlugin,
                //['filenames-simple']: simpleFilenamesPlugin,
                ['import']: importPlugin,
                ['jsdoc']: jsdocPlugin,
                //   ['react-hooks']: reactHooks,
                ['react-refresh']: reactRefresh,
                ['sort']: sortPlugin,
                ['unused-imports']: unusedImports,
                ['vitest']: vitestPlugin,
            },
        },
    ])

export default pluginsConfig
