import checkFilePlugin from 'eslint-plugin-check-file'
import {defineConfig,type Config}from '@eslint/config-helpers'


export const checkFileRules = (): Config[] => defineConfig(
    {
        name: 'Check file: Default Rules',
        rules: {
            //TODO migrate from filenames simplefilenames plugin
                },
    })