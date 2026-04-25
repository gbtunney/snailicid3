import { markdownlint } from '@snailicid3/config'

export default {
    ...markdownlint.config.get({
        MD001: false,
        MD013: {
            code_block_line_length: 140,
            code_blocks: true,
            heading_line_length: 100,
            headings: true,
            line_length: 150,
            stern: false,
            strict: false,
            tables: true,
        },
        MD024: false,
        MD025: false,
        MD032: true,
        'no-multiple-blanks': false,
    }),
    ignores: markdownlint.ignores(),
    globs: ['**/*.md'],
}
