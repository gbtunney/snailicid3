import { describe, expect, it } from 'vitest'
import {
    parseEnvironmentBoolean,
    parseEnvironmentList,
    readConfigEnvironment,
} from './environment.js'

describe('config environment', () => {
    it('provides documented workflow defaults', () => {
        expect(readConfigEnvironment({})).toMatchObject({
            allowDirty: false,
            commandName: 'gbt-exec',
            logging: false,
            packageManagerOverride: undefined,
            prefix: 'changeset',
            protectedBranches: ['main', 'master'],
            skipCommitlint: false,
            skipLintStaged: false,
        })
    })

    it.each([
        ['true', true],
        ['TRUE', true],
        ['1', true],
        ['false', false],
        ['FALSE', false],
        ['0', false],
    ] as const)('parses %s as %s', (input, expected) => {
        expect(parseEnvironmentBoolean('ALLOW_DIRTY', input, false)).toBe(
            expected,
        )
    })

    it('rejects ambiguous boolean values', () => {
        expect(() =>
            parseEnvironmentBoolean('ALLOW_DIRTY', 'yes', false),
        ).toThrow('ALLOW_DIRTY must be one of')
    })

    it('parses, trims, and deduplicates lists', () => {
        expect(parseEnvironmentList('main, release,main', [])).toEqual([
            'main',
            'release',
        ])
        expect(parseEnvironmentList('', ['main'])).toEqual([])
    })

    it('validates explicit package managers', () => {
        expect(readConfigEnvironment({ PACKAGE_MANAGER: 'npm' })).toMatchObject(
            { packageManagerOverride: 'npm' },
        )
        expect(() =>
            readConfigEnvironment({ PACKAGE_MANAGER: 'yarn' }),
        ).toThrow('Unsupported PACKAGE_MANAGER: yarn')
    })
})
