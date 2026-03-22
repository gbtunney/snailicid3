import { describe, expect, test } from 'vitest'
import { sampleFunc } from './index.js'

describe('sampleFunc', () => {
    test('returns the input value unchanged', () => {
        expect(sampleFunc('hello')).toBe('hello')
        expect(sampleFunc(42)).toBe(42)
    })
})
