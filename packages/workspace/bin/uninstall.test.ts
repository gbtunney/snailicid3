import { afterEach, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import {
    chmodSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const uninstallScript = path.resolve(import.meta.dirname, 'uninstall.sh')
// These tests launch Bash subprocesses; process startup can exceed the unit-test timeout
// when Nx runs test files in parallel.
const shellIntegrationTimeout = 30_000
const temporaryDirectories: Array<string> = []

type Fixture = {
    commandLog: string
    lockfile: string
    nodeModules: string
    repository: string
    tools: string
}

function fixture(): Fixture {
    const root = mkdtempSync(path.join(tmpdir(), 'gbt-uninstall-test-'))
    temporaryDirectories.push(root)
    const repository = path.join(root, 'repo')
    const tools = path.join(root, 'tools')
    const commandLog = path.join(root, 'commands.log')
    mkdirSync(path.join(repository, 'node_modules'), { recursive: true })
    mkdirSync(tools)
    writeFileSync(path.join(repository, 'package.json'), JSON.stringify({}))
    writeFileSync(
        path.join(repository, 'pnpm-lock.yaml'),
        'lockfileVersion: 9\n',
    )

    const pnpmStub = path.join(tools, 'pnpm')
    writeFileSync(
        pnpmStub,
        `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> ${JSON.stringify(commandLog)}\n`,
    )
    chmodSync(pnpmStub, 0o755)

    return {
        commandLog,
        lockfile: path.join(repository, 'pnpm-lock.yaml'),
        nodeModules: path.join(repository, 'node_modules'),
        repository,
        tools,
    }
}

function run(target: Fixture, argv: Array<string> = []): string {
    return execFileSync('bash', [uninstallScript, ...argv], {
        encoding: 'utf8',
        env: {
            ...process.env,
            GBT_UNINSTALL_TEST_REPO_DIR: target.repository,
            PATH: `${target.tools}:${process.env['PATH'] ?? ''}`,
        },
    })
}

afterEach(() => {
    while (temporaryDirectories.length > 0) {
        rmSync(temporaryDirectories.pop() as string, {
            force: true,
            recursive: true,
        })
    }
})

describe('gbt-uninstall lockfile handling', () => {
    it(
        'preserves pnpm-lock.yaml by default while removing node_modules',
        () => {
            const target = fixture()

            const output = run(target)

            expect(existsSync(target.lockfile)).toBe(true)
            expect(existsSync(target.nodeModules)).toBe(false)
            expect(output).toContain('preserved')
            expect(readFileSync(target.commandLog, 'utf8')).not.toContain(
                'install',
            )
        },
        shellIntegrationTimeout,
    )

    it(
        'deletes pnpm-lock.yaml with --reset-lockfile',
        () => {
            const target = fixture()

            run(target, ['--reset-lockfile'])

            expect(existsSync(target.lockfile)).toBe(false)
            expect(existsSync(target.nodeModules)).toBe(false)
        },
        shellIntegrationTimeout,
    )

    it(
        'reconciles the existing lockfile with --repair-lockfile',
        () => {
            const target = fixture()

            run(target, ['--repair-lockfile'])

            expect(existsSync(target.lockfile)).toBe(true)
            expect(readFileSync(target.commandLog, 'utf8')).toContain(
                'install --lockfile-only',
            )
        },
        shellIntegrationTimeout,
    )

    it(
        'documents both lockfile modes in the help output',
        () => {
            const target = fixture()

            const output = run(target, ['--help'])

            expect(output).toContain('--repair-lockfile')
            expect(output).toContain('--reset-lockfile')
            expect(existsSync(target.lockfile)).toBe(true)
        },
        shellIntegrationTimeout,
    )
})
