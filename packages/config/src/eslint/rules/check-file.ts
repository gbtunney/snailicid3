import {type Config,defineConfig}from '@eslint/config-helpers'

export const checkFileRules = (): Array<Config> => defineConfig(
    {
        name: 'Check file: Default Rules',
        rules: {
            //TODO migrate from filenames simplefilenames plugin
                },
    })