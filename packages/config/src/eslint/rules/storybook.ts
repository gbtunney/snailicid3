import storybook from 'eslint-plugin-storybook'
import {defineConfig,type Config,}from '@eslint/config-helpers'
import { expandExtensions } from '../../helpers.js'
import { TS_FILE_EXTENSIONS } from '../../shared.js'

//const test :Config[]=         defineConfig(  [storybook.configs['flat/recommended']])

export const storybookRules = (): Config []=>   {

    const storybookRecommended =
  storybook.configs['flat/recommended'] as unknown as Config[]

console.log("GBT WTF STORYBOOK RECCD",storybookRecommended)
    return defineConfig(storybookRecommended)
}

const objFuture:Config[] = defineConfig({
files: expandExtensions(TS_FILE_EXTENSIONS, '**/src/**/*.'),
  rules: {
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'function',
                    format: ['PascalCase', 'camelCase'],
                },
            ],
        },
})
