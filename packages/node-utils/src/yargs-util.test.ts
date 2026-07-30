import { describe, expect, test } from 'vitest'
import { z } from 'zod'

import { parseArgv, safeParseArgv } from './yargs-util.js'

const argumentSchema = z.object({
    count: z.coerce.number().int().default(1),
    dryRun: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
})

describe('parseArgv', () => {
    test('returns typed values and repeated array arguments', () => {
        expect(
            parseArgv(argumentSchema, [
                '--count',
                '3',
                '--dry-run',
                '--tags',
                'gbt',
                '--tags',
                'gbt2',
            ]),
        ).toEqual({
            count: 3,
            dryRun: true,
            tags: ['gbt', 'gbt2'],
        })
    })

    test('supports a transform on the root schema', () => {
        const transformedSchema = z
            .object({ value: z.coerce.number() })
            .transform(({ value }) => value * 2)

        expect(parseArgv(transformedSchema, ['--value', '4'])).toBe(8)
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
})
