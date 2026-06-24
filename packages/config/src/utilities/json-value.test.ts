import { describe, expect, expectTypeOf, test } from 'vitest'
import {
    compact,
    type CompactSerializedJsonString,
    JsonGuards,
    type Jsonify,
    type JsonObject,
    jsonValue,
    normalize,
    normalizeArray,
    normalizeObject,
    normalizePrimitive,
    parse,
    parseArray,
    parseObject,
    parsePrimitive,
    pretty,
    type PrettySerializedJsonString,
    serialize,
    serializePretty,
    type SerializedJsonString,
    stringify,
} from './json-value.js'

const markdownlintLikeConfig = {
    config: {
        MD013: false,
        MD033: {
            allowed_elements: ['br'],
        },
    },
    globs: ['**/*.md'],
    ignores: ['**/node_modules/**'],
} satisfies JsonObject

describe('json-value utilities', () => {
    test('Jsonify omits function properties from object output types', () => {
        const input = {
            keep: 'hi',
            skip: function (): string {
                return 'hi'
            },
        }

        type Output = Jsonify<typeof input>

        expectTypeOf<Output>().toEqualTypeOf<{ keep: string }>()

        const jsonified: Output = {
            keep: 'hi',
        }

        expect(jsonified).toEqual({ keep: 'hi' })
    })

    test('Jsonify makes maybe-omitted object properties optional', () => {
        type Input = {
            keep: string
            maybe: string | undefined
            skip: undefined
        }

        type Output = Jsonify<Input>

        expectTypeOf<Output>().toMatchTypeOf<{
            keep: string
            maybe?: string
        }>()

        const jsonifiedWithoutMaybe: Output = {
            keep: 'hi',
        }

        const jsonifiedWithMaybe: Output = {
            keep: 'hi',
            maybe: 'there',
        }

        expect(jsonifiedWithoutMaybe).toEqual({ keep: 'hi' })
        expect(jsonifiedWithMaybe).toEqual({ keep: 'hi', maybe: 'there' })
    })

    test('Jsonify converts function-like array slots to null', () => {
        const input = [
            function (): string {
                return 'hi'
            },
            'ok',
            undefined,
        ] as const

        type Output = Jsonify<typeof input>

        expectTypeOf<Output>().toEqualTypeOf<readonly [null, 'ok', null]>()

        const jsonified: Output = [null, 'ok', null]

        expect(jsonified).toEqual([null, 'ok', null])
    })

    test('Jsonify uses toJSON return types for custom JSON representations', () => {
        const input = {
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
            custom: {
                toJSON: (): { ok: true } => ({ ok: true }),
            },
        }

        type Output = Jsonify<typeof input>

        expectTypeOf<Output>().toMatchTypeOf<{
            createdAt: string
            custom: { ok: true }
        }>()
    })

    test('guards accept valid JSON values and reject unsafe values', () => {
        const circular: Record<string, unknown> = {}
        circular.self = circular

        expect(JsonGuards.primitive('hi')).toBe(true)
        expect(JsonGuards.primitive(Number.NaN)).toBe(false)
        expect(JsonGuards.array(['hi', 1, null])).toBe(true)
        expect(JsonGuards.object({ hi: 'there' })).toBe(true)
        expect(JsonGuards.valueOf(markdownlintLikeConfig)).toBe(true)
        expect(JsonGuards.valueOf({ fn: () => 'nope' })).toBe(false)
        expect(JsonGuards.valueOf(circular)).toBe(false)
    })

    test('parses JSON text into guarded values', () => {
        expect(parse('{"hi":"there"}')).toEqual({ hi: 'there' })
        expect(parseObject('{"hi":"there"}')).toEqual({ hi: 'there' })
        expect(parseArray('["hi", 1, null]')).toEqual(['hi', 1, null])
        expect(parsePrimitive('"hi"')).toBe('hi')
        expect(parse('{not-json')).toBeUndefined()
        expect(parseObject('["not", "an", "object"]')).toBeUndefined()
    })

    test('stringifies validated JSON values into branded strings', () => {
        const serialized = stringify(markdownlintLikeConfig)
        const compactSerialized = compact(markdownlintLikeConfig)
        const prettySerialized = pretty(markdownlintLikeConfig)

        expectTypeOf(serialized).toMatchTypeOf<
            SerializedJsonString<typeof markdownlintLikeConfig>
        >()
        expectTypeOf(compactSerialized).toMatchTypeOf<
            CompactSerializedJsonString<typeof markdownlintLikeConfig>
        >()
        expectTypeOf(prettySerialized).toMatchTypeOf<
            PrettySerializedJsonString<typeof markdownlintLikeConfig>
        >()

        expect(serialized).toBe(JSON.stringify(markdownlintLikeConfig))
        expect(compactSerialized).not.toContain('\n')
        expect(prettySerialized).toContain('\n')
        expect(JsonGuards.serializedString(serialized)).toBe(true)
    })

    test('normalizes external object input through a JSON serialization boundary', () => {
        const input = {
            array: [
                function (): string {
                    return 'hi'
                },
                'ok',
                undefined,
                Symbol('skip'),
            ],
            keep: 'hi',
            nested: {
                keep: true,
                skip: Symbol('skip'),
            },
            skip: function (): string {
                return 'skip'
            },
        }

        expect(normalize(input)).toEqual({
            array: [null, 'ok', null, null],
            keep: 'hi',
            nested: {
                keep: true,
            },
        })
    })

    test('normalizes external input with specific guards', () => {
        expect(normalizeObject('{"hi":"there"}')).toEqual({ hi: 'there' })
        expect(normalizeArray('["hi", null]')).toEqual(['hi', null])
        expect(normalizePrimitive('"hi"')).toBe('hi')
        expect(normalizeObject('["not", "an", "object"]')).toBeUndefined()
    })

    test('does not double-serialize existing JSON object strings', () => {
        const once = serialize(markdownlintLikeConfig)
        const twice = once === undefined ? undefined : serialize(once)

        expect(once).toBeDefined()
        expect(twice).toBe(once)
        expect(twice).not.toContain('\\"')
        expect(twice === undefined ? undefined : parseObject(twice)).toEqual(
            markdownlintLikeConfig,
        )
    })

    test('pretty serializes existing JSON object strings without escaping them', () => {
        const compactSerialized = compact(markdownlintLikeConfig)
        const prettySerialized = serializePretty(compactSerialized)

        expect(prettySerialized).toBeDefined()
        expect(prettySerialized).toContain('\n')
        expect(prettySerialized).not.toContain('\\"')
        expect(
            prettySerialized === undefined
                ? undefined
                : parseObject(prettySerialized),
        ).toEqual(markdownlintLikeConfig)
    })

    test('namespace export groups the same helpers without file IO helpers', () => {
        expect(jsonValue.guard).toBe(JsonGuards)
        expect(jsonValue.parse('{"hi":"there"}')).toEqual({ hi: 'there' })
        expect(jsonValue.normalizeObject('{"hi":"there"}')).toEqual({
            hi: 'there',
        })
        expect(jsonValue.serialize({ hi: 'there' })).toBe('{"hi":"there"}')
        expect('import' in jsonValue).toBe(false)
        expect('export' in jsonValue).toBe(false)
    })
})
