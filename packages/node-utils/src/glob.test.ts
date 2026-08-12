import { describe, expect, it } from 'vitest'
import { filterFileArrByGlob } from './glob.js'

describe('filterFileArrByGlob', () => {
    const files = ['README.md', 'docs/api.api.md', 'src/index.ts', 'x.json']

    it('keeps files matching any glob', () => {
        expect(filterFileArrByGlob(files, ['**/*.md'])).toEqual([
            'README.md',
            'docs/api.api.md',
        ])
    })

    it('removes matches when negated', () => {
        expect(filterFileArrByGlob(files, ['**/*.api.md'], true)).toEqual([
            'README.md',
            'src/index.ts',
            'x.json',
        ])
    })

    it('returns an empty array when nothing matches', () => {
        expect(filterFileArrByGlob(files, ['**/*.css'])).toEqual([])
    })
})
