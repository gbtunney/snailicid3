import { describe, expect, expectTypeOf, test } from 'vitest'
import { z } from 'zod'

import { parseArgv, parseArgvPositionals, safeParseArgv } from './argv.js'

const argumentSchema = z.object({
    count: z.coerce.number().int().default(1),
    dryRun: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
})

describe('parseArgv', () => {
    test('returns the schema output directly when no positional schema is supplied', () => {
        const result = parseArgv(argumentSchema, [
            '--count',
            '3',
            '--dry-run',
            '--tags',
            'gbt',
            '--tags',
            'gbt2',
        ])

        expect(result).toEqual({
            count: 3,
            dryRun: true,
            tags: ['gbt', 'gbt2'],
        })
        expectTypeOf(result).toEqualTypeOf<{
            count: number
            dryRun: boolean
            tags: Array<string>
        }>()
    })

    test('accepts object-like record and discriminated-union schemas', () => {
        const recordResult = parseArgv(z.record(z.string(), z.string()), [
            '--name',
            'snail',
        ])
        const unionResult = parseArgv(
            z.discriminatedUnion('mode', [
                z.object({ mode: z.literal('copy') }),
                z.object({ mode: z.literal('move') }),
            ]),
            ['--mode', 'copy'],
        )

        expect(recordResult).toMatchObject({ name: 'snail' })
        expect(unionResult).toMatchObject({ mode: 'copy' })
    })

    test('throws a Zod error for invalid arguments', () => {
        expect(() => parseArgv(z.object({ file: z.string() }), [])).toThrow(
            z.ZodError,
        )
    })
})

describe('safeParseArgv', () => {
    test('returns validation failures without throwing', () => {
        const result = safeParseArgv(
            z.object({ count: z.coerce.number().positive() }),
            ['--count', '-1'],
        )

        expect(result.success).toBe(false)
    })

    test('returns typed data after the success check', () => {
        const result = safeParseArgv(argumentSchema, ['--count', '2'])

        expect(result.success).toBe(true)
        if (!result.success) return

        expect(result.data.count).toBe(2)
        expectTypeOf(result.data.count).toEqualTypeOf<number>()
    })
})

describe('positional argv', () => {
    test('returns raw positional tokens without flags', () => {
        expect(
            parseArgvPositionals(['input.ts', 'output.ts', '--dry-run']),
        ).toEqual(['input.ts', 'output.ts'])
    })

    test('parses fixed tuple positionals separately from options', () => {
        const positionalSchema = z.tuple([
            z.string(),
            z.coerce.number(),
            z.enum(['json', 'yaml']),
        ])
        const result = parseArgv(
            z.object({ dryRun: z.boolean().default(false) }),
            ['input.ts', '10', 'json', '--dry-run'],
            positionalSchema,
        )

        expect(result).toEqual({
            options: { dryRun: true },
            positionals: ['input.ts', 10, 'json'],
        })
        expectTypeOf(result.positionals).toEqualTypeOf<
            [string, number, 'json' | 'yaml']
        >()
    })

    test('retains the inferred variadic tuple tail', () => {
        const positionalSchema = z.tuple([z.string()], z.coerce.number())
        const result = parseArgv(
            z.object({}),
            ['sum', '1', '2', '3'],
            positionalSchema,
        )

        expect(result.positionals).toEqual(['sum', 1, 2, 3])
        expectTypeOf(result.positionals).toEqualTypeOf<
            [string, ...Array<number>]
        >()
    })

    test('rejects extra positionals without a tuple rest schema', () => {
        const result = safeParseArgv(
            z.object({}),
            ['one', 'two'],
            z.tuple([z.string()]),
        )

        expect(result.success).toBe(false)
    })
})

describe('boolean flag declaration', () => {
    const schema = z.strictObject({
        commit: z.boolean().optional(),
        scope: z.string().optional(),
        verbose: z.boolean().default(false),
    })

    test('does not swallow the token after a boolean flag', () => {
        // Undeclared, yargs reads `chore` as the value of --commit and loses a positional.
        const parsed = parseArgv(
            schema,
            ['--commit', 'chore', 'subject'],
            z.array(z.string()),
        )

        expect(parsed.options.commit).toBe(true)
        expect(parsed.positionals).toEqual(['chore', 'subject'])
    })

    test('still reads a value for a string option', () => {
        const parsed = parseArgv(
            schema,
            ['--scope', 'config'],
            z.array(z.string()),
        )

        expect(parsed.options.scope).toBe('config')
        expect(parsed.positionals).toEqual([])
    })

    test('unwraps default() when deciding what is boolean', () => {
        const parsed = parseArgv(
            schema,
            ['--verbose', 'tail'],
            z.array(z.string()),
        )

        expect(parsed.options.verbose).toBe(true)
        expect(parsed.positionals).toEqual(['tail'])
    })
})
