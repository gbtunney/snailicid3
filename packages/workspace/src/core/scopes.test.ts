import { describe, expect, it } from 'vitest'
import { shortenScopeName } from './scopes.js'

describe('shortenScopeName', () => {
    it('strips arbitrary npm scopes without cutting trailing characters', () => {
        expect(shortenScopeName('@snailicid3/color')).toBe('color')
        expect(shortenScopeName('@snailicid3/logger')).toBe('logger')
        expect(shortenScopeName('@gbt/playground')).toBe('playground')
        expect(shortenScopeName('@whatever/root')).toBe('root')
    })

    it('keeps unscoped package names', () => {
        expect(shortenScopeName('unscoped-package')).toBe('unscoped-package')
    })

    it('preserves prefixes when keepPrefix=true', () => {
        expect(shortenScopeName('@snailicid3/color', true)).toBe(
            '@snailicid3/color',
        )
        expect(shortenScopeName('@gbt/playground', true)).toBe(
            '@gbt/playground',
        )
    })
})

describe('edge cases', () => {
    it('leaves malformed scoped-looking names unchanged', () => {
        expect(shortenScopeName('@snailicid3')).toBe('@snailicid3')
        expect(shortenScopeName('@')).toBe('@')
    })
})
