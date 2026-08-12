import { describe, expect, test, vi } from 'vitest'
import { z } from 'zod'

import {
    defineEnv,
    getEnvironmentReportRows,
    reportEnvironment,
} from './environment.js'

describe('defineEnv', () => {
    test('parses, coerces, and defaults values with Zod', () => {
        const environment = defineEnv({
            debug: z.stringbool().default(false),
            port: z.coerce.number().int().default(3000),
        })

        expect(environment.parse({ PORT: '8080' })).toEqual({
            debug: false,
            port: 8080,
        })
        expect(() => environment.parse({ PORT: 'invalid' })).toThrow(z.ZodError)
    })

    test('uses explicit environment-key metadata', () => {
        const environment = defineEnv({
            host: z.string().meta({ environmentKey: 'SERVER_HOST' }),
        })

        expect(environment.keys.host).toBe('SERVER_HOST')
        expect(environment.parse({ SERVER_HOST: 'localhost' })).toEqual({
            host: 'localhost',
        })
    })
})

describe('environment reports', () => {
    test('retains parsed values and identifies their source', () => {
        const environment = defineEnv({
            attempts: z.coerce.number().default(2),
            labels: z.array(z.string()).default(['local']),
        })

        expect(
            getEnvironmentReportRows(environment, { ATTEMPTS: '4' }),
        ).toEqual([
            { source: 'environment', value: 4, variable: 'ATTEMPTS' },
            { source: 'default', value: ['local'], variable: 'LABELS' },
        ])
    })

    test('redacts sensitive values by metadata or variable name', () => {
        const environment = defineEnv({
            apiToken: z.string(),
            visible: z.string().meta({ sensitive: true }),
        })

        expect(
            getEnvironmentReportRows(environment, {
                API_TOKEN: 'secret-one',
                VISIBLE: 'secret-two',
            }).map(({ value }) => value),
        ).toEqual(['[redacted]', '[redacted]'])
    })

    test('passes native values to console.table', () => {
        const table = vi.spyOn(console, 'table').mockImplementation(() => {})
        const environment = defineEnv({ enabled: z.stringbool() })

        reportEnvironment(environment, { ENABLED: 'true' })

        expect(table).toHaveBeenCalledWith([
            { Source: 'environment', Value: true, Variable: 'ENABLED' },
        ])
        table.mockRestore()
    })
})
