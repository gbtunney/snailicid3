import { describe, expect, it } from 'vitest'
import { isRootPackageName, shortenScopeName } from './lib.js'

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

describe('isRootPackageName', () => {
    it('detects root packages', () => {
        expect(isRootPackageName('root')).toBe(true)
        expect(isRootPackageName('@snailicid3/root')).toBe(true)
        expect(isRootPackageName('@gbt/root')).toBe(true)
    })

    it('does not treat non-root packages as root', () => {
        expect(isRootPackageName('@gbt/not-root')).toBe(false)
    })
})

describe('edge cases', () => {
    it('leaves malformed scoped-looking names unchanged', () => {
        expect(shortenScopeName('@snailicid3')).toBe('@snailicid3')
        expect(shortenScopeName('@')).toBe('@')
    })

    it('does not treat similar names as root packages', () => {
        expect(isRootPackageName('@gbt/rooted')).toBe(false)
        expect(isRootPackageName('@gbt/root-extra')).toBe(false)
    })
})
