import { describe, expect, test } from 'vitest'
import { type CommandResult } from './../utilities/command.js'
import { runCommand } from './../utilities/command.js'
import { getRepoRoot } from './../workspace/git.js'
import { Commitlint } from './index.js'

const cwd = import.meta
const repoRoot = getRepoRoot()
const COMMITLINT_CLI_TIMEOUT = 45_000

function runCommitlintFromStdin(commitMessage: string): CommandResult {
    return runCommand('pnpm', ['exec', 'commitlint'], {
        cwd: repoRoot,
        input: `${commitMessage}\n`,
    })
}

describe('commitlint CLI integration', () => {
    test(
        'accepts a valid commit message',
        () => {
            const result = runCommitlintFromStdin(
                'feat(root): test direct commitlint',
            )
            expect(result.status).toBe(0)
        },
        COMMITLINT_CLI_TIMEOUT,
    )

    test(
        'rejects an invalid type',
        () => {
            const result = runCommitlintFromStdin('ci(root): should fail')
            expect(result.status).not.toBe(0)
        },
        COMMITLINT_CLI_TIMEOUT,
    )

    test(
        'rejects an invalid scope',
        () => {
            const result = runCommitlintFromStdin(
                'feat(some-random-package): should fail scope',
            )
            expect(result.status).not.toBe(0)
        },
        COMMITLINT_CLI_TIMEOUT,
    )
})

describe('Commitlint export', () => {
    test('is a non-null object', () => {
        expect(Commitlint).toBeDefined()
        expect(typeof Commitlint).toBe('object')
    })

    test('has a config function', () => {
        expect(typeof Commitlint.config).toBe('function')
    })

    test('has workspace scope helpers', () => {
        expect(typeof Commitlint.workspaceScopes).toBe('function')
        expect(typeof Commitlint.workspaceScopesCsv).toBe('function')
    })

    test('config returns an object with extends', () => {
        const config = Commitlint.config({ cwd })
        expect(config).toHaveProperty('extends')
    })
})

describe('Commitlint config merge behavior', () => {
    test('appendTypes appends to commitTypes for the type-enum rule', () => {
        const config = Commitlint.config({ appendTypes: ['custom-type'], cwd })
        const typeEnumRule = config.rules?.['type-enum'] as
            [number, string, Array<string>] | undefined
        expect(typeEnumRule?.[2]).toContain('custom-type')
        expect(typeEnumRule?.[2]).toEqual(
            expect.arrayContaining([...Commitlint.commitTypes]),
        )
    })

    test('scopeOptions.mergeScopes appends to the scope-enum rule', () => {
        const config = Commitlint.config({
            cwd,
            scopeOptions: { mergeScopes: ['extra-scope'] },
        })
        const scopeEnumRule = config.rules?.['scope-enum'] as
            [number, string, Array<string>] | undefined
        expect(scopeEnumRule?.[2]).toContain('extra-scope')
    })
})
