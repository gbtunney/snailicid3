import { describe, expect, it } from 'vitest'
import {
    deriveCommitFromBranch,
    isWorkflowBranch,
    parseBranchName,
} from './branch-commit.js'

describe('parseBranchName', () => {
    it('splits changeset/release branches into prefix + slug', () => {
        expect(parseBranchName('changeset/wacky-walker')).toEqual({
            prefix: 'changeset',
            slug: 'wacky-walker',
        })
        expect(parseBranchName('release/wacky-walker')).toEqual({
            prefix: 'release',
            slug: 'wacky-walker',
        })
    })

    it('returns undefined for non-workflow branches', () => {
        expect(parseBranchName('main')).toBeUndefined()
        expect(parseBranchName('feature/x')).toBeUndefined()
        expect(parseBranchName('changeset/')).toBeUndefined()
    })
})

describe('isWorkflowBranch', () => {
    it('recognizes changeset/release branches only', () => {
        expect(isWorkflowBranch('changeset/wacky-walker')).toBe(true)
        expect(isWorkflowBranch('release/wacky-walker')).toBe(true)
        expect(isWorkflowBranch('main')).toBe(false)
    })
})

describe('deriveCommitFromBranch', () => {
    it('derives type from prefix and subject from slug (no stored message)', () => {
        const derived = deriveCommitFromBranch('changeset/wacky-walker', {
            scope: 'config',
        })
        expect(derived).toEqual({
            message: 'changeset(config): wacky-walker',
            subject: 'wacky-walker',
            type: 'changeset',
        })
    })

    it('appends an optional freeform message after the slug', () => {
        const derived = deriveCommitFromBranch('changeset/wacky-walker', {
            append: 'adjust output',
            scope: 'config',
        })
        expect(derived?.message).toBe(
            'changeset(config): wacky-walker — adjust output',
        )
    })

    it('uses the release type for release branches', () => {
        const derived = deriveCommitFromBranch('release/wacky-walker', {
            append: 'repair generated exports',
            scope: 'workspace',
        })
        expect(derived?.message).toBe(
            'release(workspace): wacky-walker — repair generated exports',
        )
    })

    it('returns undefined for a non-workflow branch', () => {
        expect(
            deriveCommitFromBranch('main', { scope: 'root' }),
        ).toBeUndefined()
    })
})
