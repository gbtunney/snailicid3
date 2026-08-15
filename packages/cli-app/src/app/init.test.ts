import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { initApp } from './init.js'

const optionsSchema = z.object({
    count: z.coerce.number().default(1).meta({ alias: 'n' }),
    dryRun: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
})

const appConfig = { name: 'test-app', print: false, version: '1.0.0' }

afterEach(() => {
    vi.restoreAllMocks()
})

/** Run initApp against explicit argv and return whatever the success callback received. */
const runApp = async (
    argv: Array<string>,
): Promise<Record<string, unknown> | undefined> => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)

    let resolved: Record<string, unknown> | undefined

    await initApp(
        optionsSchema,
        appConfig,
        (args) => {
            resolved = args
        },
        argv,
    )

    return resolved
}

describe('initApp argv bridge', () => {
    it('hands the callback validated options without the Yargs bookkeeping keys', async () => {
        const resolved = await runApp(['--count', '3', '--dry-run'])

        expect(resolved).toEqual({ count: 3, dryRun: true, tags: [] })
        // `_` and `$0` are Yargs metadata. The previous path passed the raw record straight to Zod, so
        // they leaked into the callback result and no strict schema could be used.
        expect(resolved).not.toHaveProperty('_')
        expect(resolved).not.toHaveProperty('$0')
    })

    it('applies schema defaults and coercions through the shared validator', async () => {
        expect(await runApp([])).toEqual({
            count: 1,
            dryRun: false,
            tags: [],
        })
    })

    it('resolves aliases declared in schema metadata', async () => {
        expect(await runApp(['-n', '7'])).toMatchObject({ count: 7 })
    })

    it('collects repeated flags as arrays', async () => {
        expect(await runApp(['--tags', 'a', '--tags', 'b'])).toMatchObject({
            tags: ['a', 'b'],
        })
    })

    it('reports invalid arguments instead of invoking the callback', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => undefined)

        let called = false

        const result = await initApp(
            z.object({ count: z.number() }),
            appConfig,
            () => {
                called = true
            },
            ['--count', 'not-a-number'],
        )

        expect(called).toBe(false)
        expect(result).toBeUndefined()
    })

    it('accepts a strict schema now that only user options reach Zod', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => undefined)

        let resolved: unknown

        await initApp(
            z.strictObject({ scope: z.string().default('root') }),
            appConfig,
            (args) => {
                resolved = args
            },
            ['--scope', 'config'],
        )

        expect(resolved).toEqual({ scope: 'config' })
    })
})
