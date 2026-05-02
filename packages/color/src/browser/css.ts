/**
 * CSS color keywords that have special / non-standard behaviour and should not be treated as parseable color values
 * (e.g. transparent, currentColor).
 */
export type CSSColorSpecial =
    | 'currentColor'
    | 'currentcolor'
    | 'inherit'
    | 'initial'
    | 'revert'
    | 'transparent'
    | 'unset'

const CSS_COLOR_SPECIAL: ReadonlySet<string> = new Set<CSSColorSpecial>([
    'currentColor',
    'currentcolor',
    'inherit',
    'initial',
    'revert',
    'transparent',
    'unset',
])

export const isCSSColorSpecial = (value: string): value is CSSColorSpecial =>
    CSS_COLOR_SPECIAL.has(value)
