import type { ScaffoldInput } from '../input.js'

export const HEADER_START = '<!-- @snailicid3:header:start -->'
export const HEADER_END = '<!-- @snailicid3:header:end -->'

export const generateReadme = (input: ScaffoldInput): string =>
    `${HEADER_START}
# @snailicid3/${input.name}

> ${input.description}
${HEADER_END}
`
