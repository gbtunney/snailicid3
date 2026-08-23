import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
    isChangesetContentFile,
    readChangesetPackageNames,
} from './changeset-files.js'

describe('isChangesetContentFile', () => {
    it('matches a changeset markdown file', () => {
        expect(isChangesetContentFile('.changeset/wacky-walker.md')).toBe(true)
    })

    it('excludes the generated README', () => {
        expect(isChangesetContentFile('.changeset/README.md')).toBe(false)
    })

    it('excludes files outside .changeset', () => {
        expect(isChangesetContentFile('packages/config/README.md')).toBe(false)
    })

    it('excludes non-markdown files inside .changeset', () => {
        expect(isChangesetContentFile('.changeset/config.json')).toBe(false)
    })
})

/** Run a callback against a throwaway repo root, cleaning it up afterward. */
const withTempRepo = (run: (repoRoot: string) => void): void => {
    const repoRoot = mkdtempSync(path.join(tmpdir(), 'changeset-files-'))
    try {
        run(repoRoot)
    } finally {
        rmSync(repoRoot, { force: true, recursive: true })
    }
}

describe('readChangesetPackageNames', () => {
    it('reads package names from frontmatter', () => {
        withTempRepo((repoRoot) => {
            mkdirSync(path.join(repoRoot, '.changeset'), { recursive: true })
            writeFileSync(
                path.join(repoRoot, '.changeset', 'wacky-walker.md'),
                '---\n"@scope/config": minor\n"@scope/logger": patch\n---\n\nSummary\n',
            )

            expect(
                readChangesetPackageNames(
                    repoRoot,
                    '.changeset/wacky-walker.md',
                ),
            ).toEqual(['@scope/config', '@scope/logger'])
        })
    })

    it('throws with the filename for missing content', () => {
        withTempRepo((repoRoot) => {
            expect(() =>
                readChangesetPackageNames(repoRoot, '.changeset/missing.md'),
            ).toThrow(/Unable to parse changeset \.changeset\/missing\.md/u)
        })
    })

    it('throws with the filename for malformed frontmatter', () => {
        withTempRepo((repoRoot) => {
            mkdirSync(path.join(repoRoot, '.changeset'), { recursive: true })
            writeFileSync(
                path.join(repoRoot, '.changeset', 'bad.md'),
                'not a changeset\n',
            )

            expect(() =>
                readChangesetPackageNames(repoRoot, '.changeset/bad.md'),
            ).toThrow(/Unable to parse changeset \.changeset\/bad\.md/u)
        })
    })
})
