import { describe, expect, test } from 'vitest'
import type z from 'zod'
import pkg from './../../package.json' with { type: 'json' }
import pkg2 from './gbtpkg.json' with { type: 'json' }
import {
    definePackageJson,
    schemaPackageMetaBanner,
} from './schemas/package.js'

const mypkg = JSON.parse(JSON.stringify(pkg2))
describe('@snailicid3/build-config', () => {
    test('trys build plan', () => {
        const _result = definePackageJson(mypkg)
        const pkg3: z.infer<typeof schemaPackageMetaBanner> =
            schemaPackageMetaBanner.parse(pkg)
        console.log('pkg3', pkg3, 'after')

        expect(true).toBe(true)
    })
})

export {}
