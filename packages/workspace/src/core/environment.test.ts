import { describe, expect, it } from 'vitest'

import {
    readWorkspaceEnvironment,
    workspaceEnvironment,
} from './environment.js'

describe('WorkspaceEnvironment', () => {
    it('parses defaults and explicit values from any source object', () => {
        expect(readWorkspaceEnvironment({})).toMatchObject({
            protectedBranches: ['main', 'master'],
            skipLintStaged: false,
        })
        expect(
            workspaceEnvironment.parse({
                PACKAGE_MANAGER: 'pnpm',
                PROTECTED_BRANCHES: 'main, release',
                SKIP_LINT_STAGED: 'true',
            }),
        ).toMatchObject({
            packageManagerOverride: 'pnpm',
            protectedBranches: ['main', 'release'],
            skipLintStaged: true,
        })
    })
})
