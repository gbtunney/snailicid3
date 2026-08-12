import ansis, { type AnsiColors, type Ansis } from 'ansis'

import { parseColorJS, parseColorToHexStrict } from './color.js'

export type AnsiColorPreset = AnsiColors

export type GreyAlias = 'dk' | 'lt' | 'md'

export type GreyPalette = Readonly<Record<GreyAlias | GreyShade, string>>
export type GreyShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
/** Any CSS color string accepted by `@snailicid3/color`, including hex and named colors. */
export type LoggerColor = string

/** Neutral CSS color strings, addressable by numbered stops or short aliases. */
export const GREY: GreyPalette = {
    50: 'white',
    100: 'whitesmoke',
    200: 'gainsboro',
    300: 'lightgray',
    400: 'silver',
    500: 'darkgray',
    600: 'gray',
    700: 'dimgray',
    800: '#333333',
    900: 'black',
    dk: 'dimgray',
    lt: 'gainsboro',
    md: 'gray',
}

export const GRAY: typeof GREY = GREY

const FOREGROUND_COLORS = [
    'black',
    'red',
    'green',
    'yellow',
    'blue',
    'magenta',
    'cyan',
    'white',
    'gray',
    'redBright',
    'greenBright',
    'yellowBright',
    'blueBright',
    'magentaBright',
    'cyanBright',
    'whiteBright',
] as const satisfies ReadonlyArray<AnsiColorPreset>

type ForegroundColorPreset = (typeof FOREGROUND_COLORS)[number]

const foregroundColors = new Set<string>(FOREGROUND_COLORS)

const upperCaseFirst = (value: string): string =>
    `${value.charAt(0).toUpperCase()}${value.slice(1)}`

const normalizeForegroundPreset = (
    value: string,
): ForegroundColorPreset | undefined => {
    let normalized = value.trim().replaceAll('_', '-').replace(/^fg-/iu, '')
    normalized = normalized.replace(/^bg-/iu, '').replace(/^bg(?=[A-Z])/u, '')
    normalized = normalized.toLowerCase() === 'grey' ? 'gray' : normalized

    if (normalized.toLowerCase().startsWith('bright-')) {
        normalized = `${normalized.slice('bright-'.length)}Bright`
    } else if (normalized.toLowerCase().endsWith('-bright')) {
        normalized = `${normalized.slice(0, -'-bright'.length)}Bright`
    } else if (normalized === normalized.toLowerCase()) {
        normalized = normalized.replace(/bright$/u, 'Bright')
    }

    return foregroundColors.has(normalized)
        ? (normalized as ForegroundColorPreset)
        : undefined
}

const normalizeColorAlias = (value: string): string => {
    const normalized = value.trim().toLowerCase().replaceAll('_', '-')
    const grayMatch = normalized.match(
        /^(?:gray|grey)-(50|100|200|300|400|500|600|700|800|900|lt|md|dk)$/u,
    )
    if (grayMatch?.[1]) return GREY[grayMatch[1] as keyof typeof GREY]

    const descriptiveAliases: Readonly<Record<string, string>> = {
        'dark-gray': GREY.dk,
        'dark-grey': GREY.dk,
        'light-gray': GREY.lt,
        'light-grey': GREY.lt,
        'medium-gray': GREY.md,
        'medium-grey': GREY.md,
        'mid-gray': GREY.md,
        'mid-grey': GREY.md,
    }
    return (
        descriptiveAliases[normalized] ?? normalized.replaceAll('grey', 'gray')
    )
}

export const isAnsiColorPreset = (value: string): value is AnsiColorPreset => {
    if (normalizeForegroundPreset(value) === undefined) return false
    return true
}

const foregroundToBackground = (
    color: ForegroundColorPreset,
): AnsiColorPreset => `bg${upperCaseFirst(color)}` as AnsiColorPreset

/** Resolve an ANSI palette name or any valid CSS color string to an Ansis styler. */
export const getColorAnsiInstance = (
    color: LoggerColor,
    theme: 'bg' | 'fg' = 'fg',
): Ansis => {
    const normalizedColor = normalizeColorAlias(color)
    const preset = normalizeForegroundPreset(normalizedColor)
    if (preset !== undefined) {
        const ansiPreset =
            theme === 'bg' ? foregroundToBackground(preset) : preset
        return ansis[ansiPreset]
    }

    const hexColor = parseColorToHexStrict(normalizedColor).toString()
    return theme === 'bg' ? ansis.bgHex(hexColor) : ansis.hex(hexColor)
}

export const wrapColorAnsiText = (
    value: string,
    color: LoggerColor,
    theme: 'bg' | 'fg' = 'fg',
): string => getColorAnsiInstance(color, theme)(value)

/** Create an OSC 8 terminal hyperlink when supported, retaining readable label text otherwise. */
export const terminalLink = (label: string, url: string): string =>
    ansis.link(url, label)

export const ansiPresetToHex = (color: AnsiColorPreset): string =>
    parseColorToHexStrict(normalizeForegroundPreset(color) ?? color).toString()

export const ansiPresetToColorJS = (
    color: AnsiColorPreset,
): ReturnType<typeof parseColorJS> =>
    parseColorJS(normalizeForegroundPreset(color) ?? color)
