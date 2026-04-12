import { markdownlint } from '@snailicide/build-config'
export const mdlint = { config: markdownlint.config({}) }
// @ts-check

const options = {
    config: {
        // 'MD001/heading-increment'
        MD001: false,
        MD013: {
            // Number of characters for code blocks
            //  code_block_line_length: markdownlint.getScaledWidth('comments'),
            code_block_line_length: 140,
            // Include code blocks
            code_blocks: true,
            // Number of characters for headings
            heading_line_length: 100, //markdownlint.getScaledWidth('markdown'),

            // Include headings
            headings: true,
            // Number of characters
            line_length: 150, //TODO: this is temporary pls change back!! markdownlint.getScaledWidth('markdown'),
            // Stern length checking
            stern: false,
            // Strict length checking
            strict: false,
            // Include tables
            tables: true,
        },
        //'MD024/no-duplicate-heading'
        MD024: false,
        // 'MD025/single-title/single-h1'
        MD025: false,
        //todo: temporarily dosabled. pls try to fix later, also how can i include the
        MD032: true,
        'no-multiple-blanks': false,
    },
}

export default { mdlint, ...options }
