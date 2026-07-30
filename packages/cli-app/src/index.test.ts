import { describe, expect, it } from 'vitest'
import {
    commonFlagsSchema,
    initApp,
    initializeApp,
    wrapSchema,
} from './index.js'

describe('@snailicid3/cli-app exports', () => {
    it('exports the public CLI building blocks', () => {
        expect(commonFlagsSchema).toBeDefined()
        expect(initApp).toBe(initializeApp)
        expect(wrapSchema(commonFlagsSchema)).toBe(commonFlagsSchema)
    })
})
