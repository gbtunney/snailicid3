import { describe, expect, test } from 'vitest'
import {
    defineConfig,
    expandExtensions,
    JS_FILE_EXTENSIONS,
    JSLIKE_FILE_EXTENSIONS,
    PRETTIER_FILE_EXTENSIONS,
    TS_FILE_EXTENSIONS,
} from './index.js'

describe('file extension constants', () => {
    test('JS_FILE_EXTENSIONS contains js', () => {
        expect(JS_FILE_EXTENSIONS).toContain('js')
    })

    test('TS_FILE_EXTENSIONS contains ts', () => {
        expect(TS_FILE_EXTENSIONS).toContain('ts')
    })

    test('JSLIKE_FILE_EXTENSIONS includes both js and ts entries', () => {
        expect(JSLIKE_FILE_EXTENSIONS).toContain('js')
        expect(JSLIKE_FILE_EXTENSIONS).toContain('ts')
    })

    test('PRETTIER_FILE_EXTENSIONS is a non-empty array', () => {
        expect(Array.isArray(PRETTIER_FILE_EXTENSIONS)).toBe(true)
        expect(PRETTIER_FILE_EXTENSIONS.length).toBeGreaterThan(0)
    })
})

describe('expandExtensions', () => {
    test('returns an array of the same length', () => {
        expect(expandExtensions(['ts', 'js'])).toHaveLength(2)
    })

    test('passes extensions through without a base pattern', () => {
        expect(expandExtensions(['ts'])).toEqual(['ts'])
    })

    test('prepends base pattern with trailing dot', () => {
        expect(expandExtensions(['ts'], 'src')).toEqual(['src.ts'])
    })
})

describe('core defineConfig', () => {
    test('returns the config unchanged', () => {
        expect(defineConfig({ a: 1 })).toEqual({ a: 1 })
    })
})

export {}
