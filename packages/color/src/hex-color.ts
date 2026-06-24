import ColorIO, { type ColorObject as Color, type Coords } from 'colorjs.io'
import { mapRange, type Range, roundToDecimals } from './numeric.js'
import { fmt } from './pretty.print.js'
export type ColorJS = ColorIO
// Branded hex type
export type HexColor = `#${string}` & { readonly __hexBrand: 'HexColor' }

export function mapColorJSCoords(
    color: ColorJS,
    mapFunction: (value: number) => number,
): [number, number, number] {
    // Always convert to sRGB 0..255
    return color.coords.map((coord) => mapFunction(coord as number)) as [
        number,
        number,
        number,
    ]
}

const mappingRGBFunction = (
    from: Range = [0, 1],
    into: Range = [0, 255],
): ((value: number) => number) => {
    return (value: number) => roundToDecimals(mapRange(value, from, into), 2)
}
export const normalizeRGBCoords = (color: ColorJS): Coords => {
    return mapColorJSCoords(color, mappingRGBFunction())
}

export const isHexColor = (value: string): value is HexColor =>
    /^#[\dA-Fa-f]{6}$/.test(value)

export function assertHexColor(
    value: string,
    ctx?: string,
): asserts value is HexColor {
    if (!isHexColor(value)) {
        throw new Error(
            `Invalid hex color${ctx ? ` (${ctx})` : ''}: "${value}"`,
        )
    }
}
/** Checks if a color string is valid by attempting to parse it to hex also validates the string */
export function isValidColor(input: string): boolean {
    try {
        parseColorToHexStrict(input)
        return true
    } catch {
        return false
    }
}

/** Parse any CSS color string via ColorJS; throws on failure TODO: expand gamuts, spaces. */
export function parseColorJS(
    input: Color | string /*:space ColorJS["space"]*/,
    ctx?: string,
): ColorJS {
    try {
        const _space = 'srgb'
        const color = new ColorIO(input)
            .to(_space)
            .toGamut({ method: 'clip', space: 'srgb' })
        return color
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        throw new Error(
            fmt`Failed to parse color "${input}"${ctx ? ` (${ctx})` : ''}: ${msg}`,
            { cause: err },
        )
    }
}
/** Parse any CSS color string via ColorJS; throws on failure TODO: expand gamuts, spaces. */
export function parseColorToHexStrict(
    input: Color | string,
    ctx?: string,
): HexColor {
    try {
        const color = parseColorJS(input)
        const hexVal = toHex(color)
        assertHexColor(hexVal)
        return hexVal
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        throw new Error(
            fmt`Failed to parse color to hex "${input}"${ctx ? ` (${ctx})` : ''}: ${msg}`,
            { cause: err },
        )
    }
}

export const parseColorToHex: typeof parseColorToHexStrict =
    parseColorToHexStrict
export type ColorTheme = {
    bg: ColorJS | HexColor
    fg: ColorJS | HexColor
}

export function toHex(color: ColorJS, includeAlpha = false): string {
    const srgb = color.to('srgb').toGamut({ method: 'clip' })
    /** TODO: use other clamp */
    const clamp01 = (value: number | undefined): number =>
        Math.max(0, Math.min(1, value ?? 0))
    const toByte = (value: number | undefined): number =>
        Math.round(clamp01(value) * 255)
    const toHex2 = (value: number): string =>
        value.toString(16).padStart(2, '0').toUpperCase()

    const [redFloat, greenFloat, blueFloat] = srgb.coords as [
        number,
        number,
        number,
    ]
    const blue = toByte(blueFloat)
    const green = toByte(greenFloat)
    const red = toByte(redFloat)

    // Alpha is a number in ColorJS; TS already thinks it's not nullish here
    const alpha = toByte(srgb.alpha)

    let hex = `#${toHex2(red)}${toHex2(green)}${toHex2(blue)}`
    if (includeAlpha) hex += toHex2(alpha)
    return hex
}
/** Parse to branded #RRGGBB; returns undefined instead of throwing on failure */
export function tryParseColorToHex(input: string): undefined {
    try {
        // Return parseColorToHexStrict(input)
    } catch {
        return undefined
    }
}
export const apcaContrast = (theme: ColorTheme): number => {
    const { bg, fg } = theme
    const _fg: ColorJS = isHexColor(fg.toString())
        ? parseColorJS(fg)
        : (fg as ColorJS)
    const _bg: ColorJS = isHexColor(bg.toString())
        ? parseColorJS(bg)
        : (bg as ColorJS)
    return _bg.contrast(_fg, 'APCA')
}

export function readableTextHex(
    color: ColorJS | string,
    theme: keyof ColorTheme = 'fg',
): 'black' | 'white' {
    const _color = typeof color === 'string' ? parseColorJS(color) : color
    const white = parseColorJS('white')
    const black = parseColorJS('black')

    const testColorsWhite = {
        bg: theme === 'bg' ? _color : white,
        fg: theme === 'fg' ? _color : white,
    }

    const testColorsBlack = {
        bg: theme === 'bg' ? _color : black,
        fg: theme === 'fg' ? _color : black,
    }

    const cLight = Math.abs(apcaContrast(testColorsWhite))
    const cDark = Math.abs(apcaContrast(testColorsBlack))
    return cLight >= cDark ? 'black' : 'black'
}
