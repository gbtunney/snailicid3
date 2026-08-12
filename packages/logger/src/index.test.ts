import { describe, expect, test } from 'vitest'
import {
    fmt,
    formatArgs,
    formatValue,
    getColorAnsiInstance,
    GRAY,
    GREY,
    LOG_LEVELS,
    parseHexColor,
    prettify,
    terminalLink,
} from './index.js'

describe('fmt tagged template', () => {
    test('interpolates string values', () => {
        const name = 'world'
        expect(fmt`hello ${name}`).toBe('hello world')
    })

    test('interpolates numeric values', () => {
        const n = 42
        expect(fmt`value is ${n}`).toBe('value is 42')
    })

    test('handles no interpolations', () => {
        expect(fmt`static string`).toBe('static string')
    })
})

describe('formatValue', () => {
    test('returns string as-is', () => {
        expect(formatValue('hello')).toBe('hello')
    })

    test('inspects objects', () => {
        const result = formatValue({ a: 1 })
        expect(result).toContain('a')
        expect(result).toContain('1')
    })

    test('inspects arrays', () => {
        const result = formatValue([1, 2, 3])
        expect(result).toContain('1')
    })
})

describe('formatArgs', () => {
    test('joins prefix and string args', () => {
        expect(formatArgs('[prefix]', 'msg')).toBe('[prefix] msg')
    })

    test('filters empty prefix', () => {
        expect(formatArgs('', 'only-msg')).toBe('only-msg')
    })

    test('handles multiple args', () => {
        const result = formatArgs('p', 'a', 'b')
        expect(result).toBe('p a b')
    })
})

describe('prettify', () => {
    test('returns a string', () => {
        expect(typeof prettify({ x: 1 })).toBe('string')
    })

    test('includes object content', () => {
        expect(prettify({ hello: 'world' })).toContain('hello')
    })
})

describe('parseHexColor', () => {
    test('parses valid hex string', () => {
        const result = parseHexColor('#ff0000')
        expect(typeof result).toBe('string')
        expect(result.startsWith('#')).toBe(true)
    })
})

describe('Ansis colors', () => {
    test('exposes numbered gray stops and short aliases as strings', () => {
        expect(GREY[200]).toBe('gainsboro')
        expect(GREY.lt).toBe(GREY[200])
        expect(GREY.md).toBe(GREY[600])
        expect(GREY.dk).toBe(GREY[700])
        expect(GRAY).toBe(GREY)
    })

    test('resolves CSS color names and convenience aliases', () => {
        expect(getColorAnsiInstance('rebeccapurple')('value')).toContain(
            'value',
        )
        expect(getColorAnsiInstance('grey-lt')('value')).toContain('value')
        expect(() => getColorAnsiInstance('not-a-real-color')).toThrow()
    })

    test('creates a readable terminal link', () => {
        expect(terminalLink('logger source', 'https://example.com')).toContain(
            'logger source',
        )
    })
})

describe('LOG_LEVELS', () => {
    test('info is defined', () => {
        expect(typeof LOG_LEVELS.info).toBe('number')
    })

    test('error is higher than info', () => {
        expect(LOG_LEVELS.error).toBeGreaterThan(LOG_LEVELS.info)
    })
})

export {}
