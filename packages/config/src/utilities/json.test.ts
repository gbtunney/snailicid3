import { describe, expect, expectTypeOf, it, test } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { type MarkdownlintTool } from './../markdownlint/index.js'
import { jsonValue } from './json-value.js'
import { isJsonValue, json } from './json.js'

const makeTemporaryDirectory = (): string =>
    fs.mkdtempSync(path.join(os.tmpdir(), 'snailicid3-config-json-'))

describe('json utilities', () => {
    const markdownlintLikeConfig: MarkdownlintTool['config'] = {
        config: {
            MD013: false,
            //  "hello": "world",
            MD033: {
                allowed_elements: ['br'],
            },
        },
        globs: ['**/*.md'],
        ignores: ['**/node_modules/**'],
    }

    it('deserializes raw objects without a caller-side generic', () => {
        const parsed = jsonValue.normalizeObject(markdownlintLikeConfig)
        expect(parsed).toEqual(markdownlintLikeConfig)
    })

    it('deserializes stringified JSON objects', () => {
        const parsed = jsonValue.parse(JSON.stringify(markdownlintLikeConfig))
        expect(parsed).toEqual(markdownlintLikeConfig)
    })

    it('sanitizes object values through JSON boundaries', () => {
        const parsed = jsonValue.normalizeObject({
            keep: true,
            strip: undefined,
        })
        expect(parsed).toEqual({ keep: true })
    })

    it('keeps serialize compact unless pretty output is requested', () => {
        const compact = jsonValue.serialize(markdownlintLikeConfig)
        const pretty = jsonValue.pretty(markdownlintLikeConfig)

        expect(compact).toBe(JSON.stringify(markdownlintLikeConfig))
        expect(compact).not.toContain('\n')
        expect(pretty).toContain('\n')
    })

    it('does not double-serialize existing JSON object strings', () => {
        const once = jsonValue.serialize(markdownlintLikeConfig)
        const twice = jsonValue.serialize(once)

        expect(twice).toBe(once)
        expect(twice).not.toContain('\\"')
        expect(json.object(twice)).toEqual(markdownlintLikeConfig)
    })

    it('pretty prints existing JSON object strings without double-serializing', () => {
        const compact = jsonValue.normalize(markdownlintLikeConfig)
        const pretty = jsonValue.serializePretty(compact)

        expect(pretty).toContain('\n')
        expect(pretty).not.toContain('\\"')
        expect(jsonValue.serialize(pretty)).toEqual(markdownlintLikeConfig)
    })
    it('exports and imports JSON objects through validated boundaries', async () => {
        const temporaryDirectory = makeTemporaryDirectory()
        const filename = path.join(temporaryDirectory, 'markdownlint.json')

        try {
            expect(
                json.exportFile(
                    [
                        {
                            data: json.serialize(markdownlintLikeConfig),
                            filename: 'markdownlint',
                        },
                    ],
                    temporaryDirectory,
                ),
            ).toBe(true)

            const written = fs.readFileSync(filename, 'utf8')

            expect(written).toContain('\n')
            expect(JSON.parse(written)).toEqual(markdownlintLikeConfig)
            await expect(json.importObject(filename)).resolves.toEqual(
                markdownlintLikeConfig,
            )
        } finally {
            fs.rmSync(temporaryDirectory, { force: true, recursive: true })
        }
    })

    it('does not export invalid top-level JSON data', () => {
        const temporaryDirectory = makeTemporaryDirectory()
        const filename = path.join(temporaryDirectory, 'invalid.json')

        try {
            expect(() =>
                json.exportFile(
                    [
                        {
                            data: undefined,
                            filename: 'invalid',
                        },
                    ],
                    temporaryDirectory,
                ),
            ).toThrow('data is not JSON serializable')
            expect(fs.existsSync(filename)).toBe(false)
        } finally {
            fs.rmSync(temporaryDirectory, { force: true, recursive: true })
        }
    })

    it('rejects non-object values from the object helper', () => {
        expect(jsonValue.parse('[1, 2, 3]')).toBeUndefined()
        expect(jsonValue.parse('not-json')).toBeUndefined()
        expect(jsonValue.serialize(null)).toBeUndefined()
    })

    it('exposes strict JSON value and object guards', () => {
        expect(isJsonValue({ a: ['b', 1, null, true] })).toBe(true)
        expect(isJsonValue(Number.NaN)).toBe(false)

        //TODO fix this so it wont acept array in object
        expect(jsonValue.guard.array({ a: 1 })).toBe(true)
        //Shouldntthis take aparam???
        expect(jsonValue.guard.valueOf([])).toBe(false)
    })
})

describe('JSON serialize', () => {
    test('prettyPrintJSON should return a pretty-printed JSON string', () => {
        const obj = { age: 30, name: 'John' }
        const result = jsonValue.pretty(obj)
        expect(result).toBeTypeOf('string')
    })
    test('safeDeserializeJson should return a deserialized JSON object', () => {
        const json = `{"name":"John","age":30}`
        const expected = { age: 30, name: 'John' }
        const result = jsonValue.normalizeObject(json)
        const resultParse = jsonValue.parse(json)

        expect(result).toEqual(expected)
        expect(resultParse).toEqual(expected)
    })

    test("demoDeserializeJSON  and serialize  should return the deserialized JSON object with the tag or 'ERROR'", () => {
        type TestJson = { age: number; name: string }
        const testjson: TestJson = { age: 30, name: 'John' }

        const serialized_result = jsonValue.serialize(testjson)
        expect(serialized_result).toBeTypeOf('string')

        if (serialized_result !== 'ERROR') {
            const ppExample = serialized_result
            const result = jsonValue.serialize(serialized_result)
            expectTypeOf(result).not.toMatchObjectType<{
                age: string
                name: string
            }>()
            /* ExpectTypeOf(result).toMatchObjectType<{
                name: string
                age: number
            }>()*/
        }
    })

    test("SerializeJson should return a serialized JSON string with the tag or 'ERROR'", () => {
        const obj = { age: 30, name: 'John' }
        const expected = `{"name":"John","age":30}`

        const result = jsonValue.serialize(obj)
        expect(result).toMatch(new RegExp(/age/, 'gm'))
        const result2 = jsonValue.serialize(obj)
        const invalidObj = { age: 'thirty', name: 'John' }
        const errorResult = jsonValue.serialize(invalidObj)
        expect(errorResult).toEqual(JSON.stringify(invalidObj))
        expectTypeOf(obj).not.toMatchObjectType()
        const _errorResult = jsonValue.normalize(errorResult)
        console.log('_errorResult', _errorResult)
        if (errorResult !== 'ERROR') {
            //  Const errorResultLat4est = demoDeserializeJSON(errorResult)
        }
    })
})
