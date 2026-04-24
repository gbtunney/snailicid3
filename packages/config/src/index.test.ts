import { describe, expect, test } from 'vitest'
import {
    commitlint,
    EsLint,
    expandExtensions,
    JS_FILE_EXTENSIONS,
    JSLIKE_FILE_EXTENSIONS,
    markdownlint,
    PRETTIER_FILE_EXTENSIONS,
    Prettier,
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

describe('commitlint export', () => {
    test('is a non-null object', () => {
        expect(commitlint).toBeDefined()
        expect(typeof commitlint).toBe('object')
    })

    test('has a configuration function', () => {
        expect(typeof commitlint.configuration).toBe('function')
    })

    test('configuration returns an object with extends', () => {
        const config = commitlint.configuration()
        expect(config).toHaveProperty('extends')
    })
})

describe('EsLint export', () => {
    test('has a config property', () => {
        expect(EsLint).toHaveProperty('config')
    })

    test('has a defineConfig function', () => {
        expect(typeof EsLint.defineConfig).toBe('function')
    })
})

describe('Prettier export', () => {
    test('has a config property', () => {
        expect(Prettier).toHaveProperty('config')
    })

    test('has a configuration function', () => {
        expect(typeof Prettier.configuration).toBe('function')
    })

    test('has an options property', () => {
        expect(Prettier).toHaveProperty('options')
    })
})

describe('markdownlint export', () => {
    test('has a config object', () => {
        expect(markdownlint).toHaveProperty('config')
        expect(typeof markdownlint.config).toBe('object')
    })

    test('has a rules object', () => {
        expect(markdownlint).toHaveProperty('rules')
        expect(typeof markdownlint.rules).toBe('object')
    })
})

export {}
