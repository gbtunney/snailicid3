import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { isJsonValue, json } from './json.js'

const makeTemporaryDirectory = (): string =>
    fs.mkdtempSync(path.join(os.tmpdir(), 'snailicid3-node-utils-json-'))

describe('node-utils json', () => {
    const sample = { list: [1, 2, 3], nested: { keep: true }, title: 'demo' }

    it('serializes compact by default and pretty on request', () => {
        expect(json.serialize(sample)).toBe(JSON.stringify(sample))
        expect(json.serialize(sample, { pretty: true })).toContain('\n')
    })

    it('deserializes objects and rejects arrays via object()', () => {
        expect(json.deserialize(JSON.stringify(sample))).toEqual(sample)
        expect(json.object('[1, 2, 3]')).toBeUndefined()
        expect(json.object(sample)).toEqual(sample)
    })

    it('exposes strict JSON value guards', () => {
        expect(isJsonValue({ a: ['b', 1, null, true] })).toBe(true)
        expect(isJsonValue(Number.NaN)).toBe(false)
        expect(json.isObject(sample)).toBe(true)
        expect(json.isObject([1])).toBe(false)
    })

    it('round-trips through exportFile and importObject', async () => {
        const dir = makeTemporaryDirectory()
        const filename = path.join(dir, 'sample.json')

        try {
            expect(
                json.exportFile([{ data: sample, filename: 'sample' }], dir),
            ).toBe(true)

            const written = fs.readFileSync(filename, 'utf8')
            expect(written).toContain('\n')
            expect(JSON.parse(written)).toEqual(sample)
            await expect(json.importObject(filename)).resolves.toEqual(sample)
        } finally {
            fs.rmSync(dir, { force: true, recursive: true })
        }
    })

    it('throws when asked to export non-serializable data', () => {
        const dir = makeTemporaryDirectory()

        try {
            expect(() =>
                json.exportFile([{ data: undefined, filename: 'bad' }], dir),
            ).toThrow('data is not JSON serializable')
            expect(fs.existsSync(path.join(dir, 'bad.json'))).toBe(false)
        } finally {
            fs.rmSync(dir, { force: true, recursive: true })
        }
    })
})
