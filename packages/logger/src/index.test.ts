import { describe, expect, test } from 'vitest'
import {
    fmt,
    formatArgs,
    formatValue,
    LOG_LEVELS,
    parseHexColor,
    prettify,
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

describe('LOG_LEVELS', () => {
    test('info is defined', () => {
        expect(typeof LOG_LEVELS.info).toBe('number')
    })

    test('error is higher than info', () => {
        expect(LOG_LEVELS.error).toBeGreaterThan(LOG_LEVELS.info)
    })
})

export {}
