/**
 * CSS color keywords that have special / non-standard behaviour and should not be treated as parseable color values
 * (e.g. transparent, currentColor).
 */
export type CSSColorSpecial =
    | 'transparent'
    | 'currentColor'
    | 'currentcolor'
    | 'inherit'
    | 'initial'
    | 'unset'
    | 'revert'

const CSS_COLOR_SPECIAL: ReadonlySet<string> = new Set<CSSColorSpecial>([
    'transparent',
    'currentColor',
    'currentcolor',
    'inherit',
    'initial',
    'unset',
    'revert',
])

export const isCSSColorSpecial = (value: string): value is CSSColorSpecial =>
    CSS_COLOR_SPECIAL.has(value)
