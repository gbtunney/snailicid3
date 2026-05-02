import { describe, expect, test } from 'vitest'
import { isHexColor, isValidColor, parseColorToHex } from './hex-color.js'
import { colorUtils } from './index.js'

describe('@snailicid3/color — isHexColor', () => {
    test('accepts valid 6-digit hex', () => {
        expect(isHexColor('#FF0000')).toBe(true)
        expect(isHexColor('#000000')).toBe(true)
        expect(isHexColor('#aabbcc')).toBe(true)
    })

    test('rejects invalid hex strings', () => {
        expect(isHexColor('FF0000')).toBe(false) // missing #
        expect(isHexColor('#FFF')).toBe(false) // 3-digit
        expect(isHexColor('#GGGGGG')).toBe(false) // invalid chars
        expect(isHexColor('')).toBe(false)
    })
})

describe('@snailicid3/color — isValidColor (hex-color)', () => {
    test('returns true for parseable CSS colors', () => {
        expect(isValidColor('red')).toBe(true)
        expect(isValidColor('#336699')).toBe(true)
        expect(isValidColor('rgb(0, 128, 255)')).toBe(true)
    })

    test('returns false for invalid color strings', () => {
        expect(isValidColor('notacolor')).toBe(false)
        expect(isValidColor('')).toBe(false)
    })
})

describe('@snailicid3/color — parseColorToHex', () => {
    test('parses named color to uppercase hex', () => {
        const hex = parseColorToHex('red')
        expect(isHexColor(hex)).toBe(true)
        expect(hex.toUpperCase()).toBe('#FF0000')
    })

    test('round-trips a hex value', () => {
        const hex = parseColorToHex('#336699')
        expect(isHexColor(hex)).toBe(true)
    })

    test('throws on unparseable input', () => {
        expect(() => parseColorToHex('notacolor')).toThrow()
    })
})

describe('@snailicid3/color — colorUtils.isValidColor (chroma)', () => {
    test('validates color via chroma', () => {
        expect(colorUtils.isValidColor('blue')).toBe(true)
        expect(colorUtils.isValidColor('#123456')).toBe(true)
        expect(colorUtils.isValidColor('notacolor')).toBe(false)
    })
})
