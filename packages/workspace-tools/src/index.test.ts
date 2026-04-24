import { describe, expect, test } from 'vitest'
import {
    isRepoClean,
    setPackageKeys,
    workspacePackagesToArray,
    type WorkspacePackage,
} from './index.js'

const makePkg = (name: string): WorkspacePackage => ({
    name,
    path: `/repo/packages/${name}`,
    private: false,
    version: '1.0.0',
})

describe('workspacePackagesToArray', () => {
    test('converts a Map to an array', () => {
        const pkg = makePkg('alpha')
        const map = new Map([['alpha', pkg]])
        expect(workspacePackagesToArray(map)).toEqual([pkg])
    })

    test('converts a Record to an array', () => {
        const pkg = makePkg('beta')
        const record: Record<string, WorkspacePackage> = { beta: pkg }
        expect(workspacePackagesToArray(record)).toEqual([pkg])
    })

    test('returns empty array for empty Map', () => {
        expect(workspacePackagesToArray(new Map())).toEqual([])
    })

    test('returns empty array for empty Record', () => {
        expect(workspacePackagesToArray({})).toEqual([])
    })
})

describe('setPackageKeys', () => {
    const pkg = makePkg('gamma')

    test('include mode picks selected keys', () => {
        const result = setPackageKeys(pkg, 'include', ['name', 'version'])
        expect(result).toEqual({ name: 'gamma', version: '1.0.0' })
        expect(result).not.toHaveProperty('path')
    })

    test('exclude mode drops selected keys', () => {
        const result = setPackageKeys(pkg, 'exclude', ['path'])
        expect(result).toHaveProperty('name')
        expect(result).toHaveProperty('version')
        expect(result).not.toHaveProperty('path')
    })
})

describe('isRepoClean', () => {
    test('returns a boolean', () => {
        expect(typeof isRepoClean()).toBe('boolean')
    })
})

export {}
