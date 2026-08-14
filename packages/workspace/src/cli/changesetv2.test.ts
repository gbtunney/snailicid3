import { safeParseArgv } from '@snailicid3/node-utils'
import { describe, expect, it } from 'vitest'
import { optionsSchema } from './changesetv2.js'

describe('changeset CLI argument schema', () => {
    it('parses the supported options through the shared argv parser', () => {
        expect(
            safeParseArgv(optionsSchema, [
                '--allow-dirty',
                '--base',
                'trunk',
                '--prefix',
                'changeset',
            ]),
        ).toEqual({
            data: {
                allowDirty: true,
                base: 'trunk',
                prefix: 'changeset',
            },
            success: true,
        })
    })

    it('rejects unknown options', () => {
        expect(
            safeParseArgv(optionsSchema, ['--not-a-real-option']),
        ).toMatchObject({ success: false })
    })
})
