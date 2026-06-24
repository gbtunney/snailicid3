import type { Chromable, Color, ColorFormat } from 'chroma.ts'
import * as chroma from 'chroma.ts'

import { isCSSColorSpecial } from './browser/css.js'
import { tg } from './typeguard/index.js'
type HSL = [HueDegrees, Saturation, Luminance]
/** TODO get rid of all this in favor of color.js */
/**
 * @see https://en.wikipedia.org/wiki/HSL_and_HSV
 * [hueDegrees, saturation1, value1]
 */
type HueDegrees = number
type Luminance = number
type Saturation = number
const validate = (value: Chromable): boolean => {
    try {
        chroma.color(value)
        return true
    } catch (exception) {
        return false
    }
}

/** @category Validator */
export const isValidColor = <Type extends Chromable>(
    value: Type,
): value is Type => {
    return validate(value)
}

export const getChromaColor = (value: Chromable): Color | undefined =>
    isValidColor(value) ? chroma.color(value) : undefined

export const getColor = (
    value: Chromable,
    format: ColorFormat = 'hsl',
): Color | undefined => {
    if (isValidColor(value)) {
        return chroma.color(value, format)
    }
    return undefined
}

const rotateHueFunction = (hue: number, incrementValue: number): number => {
    //Todo: chheck to see if inc is an integer.
    return (hue + incrementValue) % 360
}
/** RA.rangeStep(5, 0, 20); // => [0, 5, 10, 15] */
export const complement = (
    color: Chromable,
    format: ColorFormat = 'hsl',
): Color => {
    const [hue, sat, luminance]: HSL = chroma.color(color).hsl()
    return chroma.color([rotateHueFunction(hue, 180), sat, luminance], format)
}
export const triad = (
    color: Chromable,
    format: ColorFormat = 'hsl',
): Array<Color> => {
    const [hue, sat, luminance]: HSL = chroma.color(color).hsl()
    return [hue, rotateHueFunction(hue, 120), rotateHueFunction(hue, 240)].map(
        (hue_step) => chroma.color([hue_step, sat, luminance], format),
    )
}
export const tetrad = (
    color: Chromable,
    format: ColorFormat = 'hsl',
): Array<Color> => {
    const [hue, sat, luminance]: HSL = chroma.color(color).hsl()
    return [
        hue,
        rotateHueFunction(hue, 90),
        rotateHueFunction(hue, 180),
        rotateHueFunction(hue, 270),
    ].map((hue_step) => chroma.color([hue_step, sat, luminance], format))
}
export const splitComplement = (
    color: Chromable,
    format: ColorFormat = 'hsl',
): Array<Color> => {
    const [hue, sat, luminance]: HSL = chroma.color(color).hsl()
    return [hue, rotateHueFunction(hue, 72), rotateHueFunction(hue, 216)].map(
        (hue_step) => chroma.color([hue_step, sat, luminance], format),
    )
}
export const analogous = (
    color: Chromable,
    results = 6,
    slices = 30,
): Array<Color> => {
    const [hue, sat, luminance]: HSL = chroma.color(color).hsl()
    return [hue, rotateHueFunction(hue, 72), rotateHueFunction(hue, 216)].map(
        (hue_step) => chroma.color([hue_step, sat, luminance], 'hsl'),
    )
}

/*Export const getChromaColor = (
    color: Chromable,
    format?: chroma.ColorFormat,
): ChromaColorPalatte | undefined => {
    if (!validate(color)) return undefined

    const chroma_color = chroma.color(color) //(validate(color)) ? chroma.color(color) : undefined

    const [hue, saturation, lightness] = chroma_color.hsl()
    return {
        chroma: chroma_color,
        hue,
        saturation,
        lightness,
        textColor: chroma_color.textColor(),
        luminance: chroma_color.luminance(),
        temperature: chroma_color.temperature(),
        complement: complement(chroma_color),
        split_complement: split_complement(chroma_color),
        triad: triad(chroma_color),
        tetrad: tetrad(chroma_color),
        analogous: analogous(chroma_color),
    }
}*/

const chromaColorBrighten = (
    value: string | undefined,
    amount: number,
): Color | undefined => {
    if (tg.isUndefined(value) || isCSSColorSpecial(value)) return undefined
    if (tg.isNotUndefined<string>(value)) {
        if (isValidColor(value)) {
            //TODO:make typegaurd for chroma
            return chroma.color(value).darker(3)
        }
    }
    return undefined
}

export type ChromaColorPalatte = {
    analogous: Array<Color>
    chroma: Color
    /** Palattes. */
    complement: Color
    hue: number
    lightness: number
    luminance: number
    saturation: number
    split_complement: Array<Color>
    temperature: number
    tetrad: Array<Color>
    textColor: Color
    triad: Array<Color>
}
