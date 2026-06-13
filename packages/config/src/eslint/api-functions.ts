import { type Config as EslintBuiltIn, defineConfig as defineEslintConfig } from '@eslint/config-helpers'
import globals from 'globals'
import { filePatternOverrides } from './overrides/files.js'
import pluginsConfig from './plugins.js'
import { baseRules } from './rules/base.js'
import { codeStyleRules } from './rules/codestyle.js'
import { commentsRules } from './rules/comments.js'
import { directiveRules } from './rules/directives.js'
import { importRules } from './rules/imports.js'
import { namingRules } from './rules/naming.js'
import { reactRules } from './rules/react.js'
import { testingRules } from './rules/testing.js'
import { typescriptRules } from './rules/typescript.js'
import { JS_FILE_EXTENSIONS, TS_FILE_EXTENSIONS } from '../shared.js'
import { expandExtensions } from '../utilities/extensions.js'
import {buildDefaultEslintConfig}from './base.js'

export type EslintConfigOptions = {
    /** Used as `tsconfigRootDir` for typescript-eslint's `projectService`. Defaults to `process.cwd()`. */
    cwd: string

    /** Appended to `BASE_IGNORES` (array concat). */
    ignores?: Array<string>

    /** Extra flat-config objects appended last (highest precedence in ESLint's cascade). */
    overrides?: Array<EslintBuiltIn>
}
//todo this needs to have the default identified and moved over to the base config, 
export const buildEslintConfig = ({
    cwd ,
    ignores = [],
    overrides = [],
}: EslintConfigOptions = {}): Array<EslintBuiltIn> => {

const mergedConfig:EslintBuiltIn[]= defineEslintConfig(buildDefaultEslintConfig({cwd, global_ignores: ignores} )

}
   

