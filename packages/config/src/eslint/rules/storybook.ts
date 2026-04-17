import {type Config,defineConfig,}from '@eslint/config-helpers'
import storybook from 'eslint-plugin-storybook'
import { expandExtensions } from '../../helpers.js'
import { TS_FILE_EXTENSIONS } from '../../shared.js'

//const test :Config[]=         defineConfig(  [storybook.configs['flat/recommended']])

export const storybookRules = (): Array<Config>=>   {

    const storybookRecommended =
  storybook.configs['flat/recommended'] as unknown as Array<Config>

console.log("GBT WTF STORYBOOK RECCD",storybookRecommended)
    return defineConfig(storybookRecommended)
}

const objFuture:Array<Config> = defineConfig({
files: expandExtensions(TS_FILE_EXTENSIONS, '**/src/**/*.'),
  rules: {
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    format: ['PascalCase', 'camelCase'],
                    selector: 'function',
                },
            ],
        },
})
