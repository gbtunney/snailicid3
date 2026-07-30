import { describe, expect, test } from 'vitest'
import { z } from 'zod'

import { getMetaForSchema, updateMetaForSchema } from './metadata.js'

describe('schema metadata', () => {
    test('preserves declared metadata and merges mapper metadata', () => {
        const schema = z.string().meta({
            alias: ['n', 'name'],
            description: 'Display name',
        })

        expect(updateMetaForSchema(schema, { id: 'displayName' })).toEqual({
            alias: ['n', 'name'],
            deprecated: false,
            description: 'Display name',
            hidden: false,
            id: 'displayName',
        })
        expect(getMetaForSchema(schema)?.id).toBe('displayName')
    })

    test('does not invent a placeholder description', () => {
        expect(getMetaForSchema(z.string())?.description).toBeUndefined()
    })
})
