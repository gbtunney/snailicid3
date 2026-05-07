import { describe, expect, test } from 'vitest'
import type z from 'zod'
import pkg from './../../package.json' with { type: 'json' }
import { defineEntryBuildPlan, defineTopLevelBuildPlan } from './plan2.js'
import {
    definePackageJson,
    schemaPackageMetaBanner,
} from './schemas/package.js'

const mypkg = JSON.parse(JSON.stringify(pkg))
describe('@snailicid3/build-config', () => {
    test('trys build plan', () => {
        const _result = definePackageJson(mypkg)
        const pkg3: z.infer<typeof schemaPackageMetaBanner> =
            schemaPackageMetaBanner.parse(pkg)

        defineTopLevelBuildPlan(mypkg, {})
        defineEntryBuildPlan(mypkg, {}, { key: './' })
        // console.log('pkg3', pkg3, 'after')

        expect(true).toBe(true)
    })
})

export {}
