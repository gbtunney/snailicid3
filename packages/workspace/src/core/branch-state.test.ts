import { describe, expect, it } from 'vitest'
import {
    type BranchOperation,
    type BranchState,
    classifyBranchKind,
    decideBranchAction,
} from './branch-state.js'

const state = (overrides: Partial<BranchState> = {}): BranchState => ({
    baseBranch: 'main',
    baseSync: 'in-sync',
    currentBranch: 'main',
    currentKind: 'base',
    onTarget: false,
    targetBranch: 'changeset/wacky-walker',
    targetExistsLocal: false,
    targetExistsRemote: false,
    workingTree: 'clean',
    ...overrides,
})

const decide = (s: BranchState, op: BranchOperation = 'start') =>
    decideBranchAction(s, op)

describe('classifyBranchKind', () => {
    it('classifies base, changeset, release, and other', () => {
        expect(classifyBranchKind('main', 'main')).toBe('base')
        expect(classifyBranchKind('changeset/wacky-walker', 'main')).toBe(
            'changeset',
        )
        expect(classifyBranchKind('release/wacky-walker', 'main')).toBe(
            'release',
        )
        expect(classifyBranchKind('feature/x', 'main')).toBe('other')
    })
})

describe('decideBranchAction — smart, not flat denial', () => {
    it('creates the target from base when nothing exists (clean, on base)', () => {
        const d = decide(state())
        expect(d.action).toBe('create')
        expect(d.targetBranch).toBe('changeset/wacky-walker')
        expect(d.carriesDirtyChanges).toBe(false)
    })

    it('proceeds without moving when already on the target branch', () => {
        const d = decide(
            state({
                currentBranch: 'changeset/wacky-walker',
                currentKind: 'changeset',
                onTarget: true,
            }),
        )
        expect(d.action).toBe('proceed')
    })

    it('relinks (switch) when the target already exists locally', () => {
        const d = decide(state({ targetExistsLocal: true }))
        expect(d.action).toBe('switch')
        expect(d.reason).toContain('relinking')
        expect(d.reason).toContain('local')
    })

    it('relinks (switch) to an origin-only target (e.g. CI-generated branch)', () => {
        const d = decide(
            state({
                targetBranch: 'release/wacky-walker',
                targetExistsRemote: true,
            }),
        )
        expect(d.action).toBe('switch')
        expect(d.reason).toContain('origin')
    })

    it('does NOT flat-deny a dirty tree — it carries changes with a warning', () => {
        const d = decide(state({ workingTree: 'dirty' }))
        expect(d.action).toBe('create')
        expect(d.carriesDirtyChanges).toBe(true)
        expect(d.warnings.join(' ')).toContain('dirty')
    })

    it('does NOT flat-deny an out-of-sync base — it offers to update', () => {
        const d = decide(state({ baseSync: 'behind' }))
        expect(d.action).toBe('create')
        expect(d.offerUpdateWithBase).toBe(true)
        expect(d.warnings.join(' ')).toContain('behind')
    })

    it('creates from an unrelated dirty branch, carrying changes (no denial)', () => {
        const d = decide(
            state({
                currentBranch: 'feature/x',
                currentKind: 'other',
                workingTree: 'dirty',
            }),
        )
        expect(d.action).toBe('create')
        expect(d.carriesDirtyChanges).toBe(true)
    })

    it('blocks on detached HEAD', () => {
        const d = decide(state({ currentBranch: '', currentKind: 'other' }))
        expect(d.action).toBe('block')
        expect(d.reason).toContain('detached HEAD')
    })
})

describe('decideBranchAction — publish is the base-branch exception', () => {
    it('proceeds when publishing from an in-sync base', () => {
        const d = decide(state(), 'publish')
        expect(d.action).toBe('proceed')
    })

    it('blocks a publish away from base', () => {
        const d = decide(
            state({ currentBranch: 'release/x', currentKind: 'release' }),
            'publish',
        )
        expect(d.action).toBe('block')
        expect(d.reason).toContain('base branch')
    })

    it('warns (does not block) when publishing from a behind base', () => {
        const d = decide(state({ baseSync: 'behind' }), 'publish')
        expect(d.action).toBe('proceed')
        expect(d.warnings.join(' ')).toContain('behind')
    })
})
