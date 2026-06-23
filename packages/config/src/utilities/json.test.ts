import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { isJsonObject, isJsonValue, json } from './json.js'

const makeTemporaryDirectory = (): string =>
    fs.mkdtempSync(path.join(os.tmpdir(), 'snailicid3-config-json-'))

describe('json utilities', () => {
    const markdownlintLikeConfig = {
        config: {
            MD013: false,
            MD033: {
                allowed_elements: ['br'],
            },
        },
        globs: ['**/*.md'],
        ignores: ['**/node_modules/**'],
    }

    it('deserializes raw objects without a caller-side generic', () => {
        const parsed = json.object(markdownlintLikeConfig)

        expect(parsed).toEqual(markdownlintLikeConfig)
    })

    it('deserializes stringified JSON objects', () => {
        const parsed = json.object(JSON.stringify(markdownlintLikeConfig))

        expect(parsed).toEqual(markdownlintLikeConfig)
    })

    it('sanitizes object values through JSON boundaries', () => {
        const parsed = json.object({ keep: true, strip: undefined })

        expect(parsed).toEqual({ keep: true })
    })

    it('keeps serialize compact unless pretty output is requested', () => {
        const compact = json.serialize(markdownlintLikeConfig)
        const pretty = json.prettyPrint(markdownlintLikeConfig)

        expect(compact).toBe(JSON.stringify(markdownlintLikeConfig))
        expect(compact).not.toContain('\n')
        expect(pretty).toContain('\n')
    })

    it('does not double-serialize existing JSON object strings', () => {
        const once = json.serialize(markdownlintLikeConfig)
        const twice = json.serialize(once)

        expect(twice).toBe(once)
        expect(twice).not.toContain('\\"')
        expect(json.object(twice)).toEqual(markdownlintLikeConfig)
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
        expect(json.object('[1, 2, 3]')).toBeUndefined()
        expect(json.object('not-json')).toBeUndefined()
        expect(json.object(null)).toBeUndefined()
    })

    it('exposes strict JSON value and object guards', () => {
        expect(isJsonValue({ a: ['b', 1, null, true] })).toBe(true)
        expect(isJsonValue(Number.NaN)).toBe(false)
        expect(isJsonObject({ a: 1 })).toBe(true)
        expect(isJsonObject([])).toBe(false)
    })
})
