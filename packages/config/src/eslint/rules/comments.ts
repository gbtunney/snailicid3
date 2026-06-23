import { type Config, defineConfig } from '@eslint/config-helpers'
import jsdoc from 'eslint-plugin-jsdoc'
import { getScaledWidth } from './../../shared.js'

/**
 * Comments: JSDoc documentation structure, tag validity, indentation, and formatting.
 *
 * @see [eslint-plugin-jsdoc](https://github.com/gajus/eslint-plugin-jsdoc)
 */
export const commentsRules = (): Array<Config> =>
    defineConfig(
        { ...jsdoc.configs['flat/recommended'] },
        {
            name: 'Comments: JSDoc ERROR',
            rules: {
                'capitalized-comments': [
                    'error',
                    'always',
                    {
                        ignoreConsecutiveComments: true,
                        ignoreInlineComments: true,
                        ignorePattern: '^eslint(-|$)',
                    },
                ],
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
                'jsdoc/check-tag-names': [
                    'warn',
                    { definedTags: ['group', 'category', 'todo'] },
                ],
                'jsdoc/convert-to-jsdoc-comments': [
                    'error',
                    { lineOrBlockStyle: 'both' },
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
                'jsdoc/no-blank-block-descriptions': 'error',
                'jsdoc/no-blank-blocks': ['error', { enableFixer: true }],
                /** @todo Jsdoc/no-multi-asterisks is messed up — prettier turns to hyphens */
                'jsdoc/no-multi-asterisks': [
                    'error',
                    { allowWhitespace: false },
                ],
                'jsdoc/require-asterisk-prefix': 'error',
                'jsdoc/tag-lines': ['error', 'any', { startLines: 1 }],
            },
        },
        {
            name: 'Comments: JSDoc OFF',
            rules: {
                'jsdoc/lines-before-block': 'off',
                'jsdoc/no-undefined-types': 'error',
                'jsdoc/require-jsdoc': 'off',
                'jsdoc/require-param': 'off',
                /* Keep to warn for now til i see how typedoc handles param types */
                'jsdoc/require-param-type': 'warn',
                'jsdoc/require-property-description': 'off',
                'jsdoc/require-returns': 'off',
            },
        },
    )

export default commentsRules
