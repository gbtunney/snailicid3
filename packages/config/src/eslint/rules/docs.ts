import { type Config, defineConfig } from '@eslint/config-helpers'
import jsdoc from 'eslint-plugin-jsdoc'
import { getScaledWidth } from '../../shared.js'

export const docsRules = (): Array<Config> =>
    defineConfig(
        { ...jsdoc.configs['flat/recommended'] },
        /* eslint sort/object-properties:off */
        {
            name: 'Docs: JSDoc ERROR',
            rules: {
                'jsdoc/check-alignment': 'error',
                'jsdoc/check-indentation': [
                    'error',
                    { excludeTags: ['example'] },
                ],
                'jsdoc/check-line-alignment': [
                    'error',
                    'any',
                    { wrapIndent: '  ' },
                ],
                'jsdoc/multiline-blocks': [
                    'error',
                    {
                        allowMultipleTags: true,
                        minimumLengthForMultiline: Math.floor(
                            getScaledWidth('comments') / 3,
                        ),
                        noFinalLineText: true,
                        noMultilineBlocks: false,
                        noZeroLineText: true,
                    },
                ],
                'jsdoc/tag-lines': ['error', 'any', { startLines: 1 }],
                'jsdoc/check-tag-names': [
                    'warn',
                    { definedTags: ['group', 'category', 'todo'] },
                ],
                'jsdoc/no-blank-block-descriptions': 'error',
                'jsdoc/no-blank-blocks': ['error', { enableFixer: true }],
                'jsdoc/require-asterisk-prefix': 'error',
                /** @todo Jsdoc/no-multi-asterisks is messed up, prettier turns to hyphens */
                'jsdoc/no-multi-asterisks': [
                    'error',
                    { allowWhitespace: false },
                ],
                'jsdoc/convert-to-jsdoc-comments': [
                    'error',
                    { lineOrBlockStyle: 'both' },
                ],
            },
        },
        {
            name: 'Docs: JSDoc OFF',
            rules: {
                'jsdoc/lines-before-block': 'off',
                'jsdoc/require-jsdoc': 'off',
                'jsdoc/require-param': 'off',
                'jsdoc/require-property-description': 'off',
                'jsdoc/require-returns': 'off',
            },
        },
    )
