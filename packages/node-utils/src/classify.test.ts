import { describe, expect, it } from 'vitest'
import { classifyFiles } from './classify.js'

describe('classifyFiles', () => {
    it('preserves matching files for every named classifier', () => {
        expect(
            classifyFiles(
                [
                    '.github/workflows/release.yml',
                    'packages/logger/src/index.ts',
                    'README.md',
                ],
                {
                    actions: ['.github/**'],
                    logger: ['packages/logger/**'],
                },
            ),
        ).toEqual({
            actions: ['.github/workflows/release.yml'],
            logger: ['packages/logger/src/index.ts'],
        })
    })

    it('allows one file to belong to multiple classifiers', () => {
        expect(
            classifyFiles(['packages/logger/README.md'], {
                docs: ['**/*.md'],
                logger: ['packages/logger/**'],
            }),
        ).toEqual({
            docs: ['packages/logger/README.md'],
            logger: ['packages/logger/README.md'],
        })
    })
})
