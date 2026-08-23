import { afterEach, describe, expect, it, vi } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { main, parseWorkflowArgs } from './workflow.js'

describe('parseWorkflowArgs', () => {
    it('defaults to the read-only plan', () => {
        expect(parseWorkflowArgs([])).toMatchObject({
            append: '',
            command: 'plan',
            dryRun: false,
        })
        expect(parseWorkflowArgs(['plan'])).toMatchObject({ command: 'plan' })
    })

    it('collects trailing commit text', () => {
        expect(
            parseWorkflowArgs(['commit', 'repair', 'generated', 'exports']),
        ).toMatchObject({
            append: 'repair generated exports',
            command: 'commit',
        })
    })

    it('accepts every dry-run alias', () => {
        for (const flag of ['--dry-run', '--dry', '-n']) {
            expect(parseWorkflowArgs(['commit', flag])).toMatchObject({
                dryRun: true,
            })
        }
    })

    it('parses the read-only pull request renderer options', () => {
        expect(
            parseWorkflowArgs(['pr', '--json', '--command', '--copy', 'body']),
        ).toMatchObject({
            command: 'pr',
            commandOutput: true,
            copy: 'body',
            json: true,
        })
    })

    it('reads scope, base and keep-prefix options', () => {
        expect(
            parseWorkflowArgs([
                'commit',
                '--scope',
                'config',
                '--base',
                'trunk',
                '--keep-prefix',
            ]),
        ).toMatchObject({
            baseOverride: 'trunk',
            explicitScope: 'config',
            keepPrefix: true,
        })
        expect(parseWorkflowArgs(['commit', '--full-scope'])).toMatchObject({
            keepPrefix: true,
        })
    })

    it('rejects an unknown command instead of silently planning', () => {
        expect(() => parseWorkflowArgs(['bogus'])).toThrow(/unknown command/u)
    })

    it('rejects unknown options', () => {
        expect(() => parseWorkflowArgs(['--not-real'])).toThrow(
            /invalid arguments/u,
        )
    })
})

const makeRepo = (): {
    git: (...args: Array<string>) => void
    root: string
} => {
    const root = mkdtempSync(path.join(tmpdir(), 'snail-workflow-cli-'))
    const git = (...args: Array<string>): void => {
        execFileSync('git', args, { cwd: root, stdio: 'ignore' })
    }

    git('init', '-q', '-b', 'main')
    git('config', 'user.email', 'test@example.com')
    git('config', 'user.name', 'test')
    writeFileSync(path.join(root, 'tracked.txt'), 'v1\n')
    git('add', 'tracked.txt')
    git('commit', '-qm', 'init')

    return { git, root }
}

const originalCwd = process.cwd()

afterEach(() => {
    process.chdir(originalCwd)
    vi.restoreAllMocks()
    delete process.env['SCOPE_COMMIT_SKIP_COMMITLINT']
})

/** Run the CLI inside a fixture repo, returning everything it wrote to stdout. */
const runIn = async (root: string, args: Array<string>): Promise<string> => {
    const lines: Array<string> = []
    vi.spyOn(console, 'log').mockImplementation((value: unknown) => {
        lines.push(String(value))
    })
    process.chdir(root)
    process.env['SCOPE_COMMIT_SKIP_COMMITLINT'] = 'true'
    await main(args)

    return lines.join('\n')
}

describe('gbt-workflow commit', () => {
    it('derives type and slug from the branch and scope from the explicit override', async () => {
        const { git, root } = makeRepo()

        git('switch', '-q', '-c', 'changeset/wacky-walker')
        writeFileSync(path.join(root, 'staged.txt'), 'staged\n')
        git('add', 'staged.txt')

        const output = await runIn(root, [
            'commit',
            'repair generated exports',
            '--scope',
            'config',
            '--dry-run',
        ])

        expect(output).toBe(
            'changeset(config): wacky-walker — repair generated exports',
        )
    })

    it('reuses the branch identity for a release branch and omits absent text', async () => {
        const { git, root } = makeRepo()

        git('switch', '-q', '-c', 'release/wacky-walker')
        writeFileSync(path.join(root, 'staged.txt'), 'staged\n')
        git('add', 'staged.txt')

        expect(
            await runIn(root, ['commit', '--scope', 'workspace', '--dry-run']),
        ).toBe('release(workspace): wacky-walker')
    })

    it('records the commit when not a dry run', async () => {
        const { git, root } = makeRepo()

        git('switch', '-q', '-c', 'changeset/wacky-walker')
        writeFileSync(path.join(root, 'staged.txt'), 'staged\n')
        git('add', 'staged.txt')

        await runIn(root, ['commit', '--scope', 'config'])

        const subject = execFileSync('git', ['log', '-1', '--pretty=%s'], {
            cwd: root,
            encoding: 'utf8',
        }).trim()

        expect(subject).toBe('changeset(config): wacky-walker')
    })

    it('refuses to guess a workflow on an unrecognized branch', async () => {
        const { root } = makeRepo()

        writeFileSync(path.join(root, 'staged.txt'), 'staged\n')
        execFileSync('git', ['add', 'staged.txt'], { cwd: root })

        await expect(
            runIn(root, ['commit', '--scope', 'config']),
        ).rejects.toThrow(/not a changeset\/\* or release\/\* branch/u)
    })

    it('refuses to commit when nothing is staged', async () => {
        const { git, root } = makeRepo()

        git('switch', '-q', '-c', 'changeset/wacky-walker')

        await expect(
            runIn(root, ['commit', '--scope', 'config']),
        ).rejects.toThrow(/Nothing is staged/u)
    })
})

describe('gbt-workflow plan', () => {
    it('reports status read-only and leaves the repository untouched', async () => {
        const { git, root } = makeRepo()

        git('switch', '-q', '-c', 'changeset/wacky-walker')
        writeFileSync(path.join(root, 'staged.txt'), 'staged\n')
        git('add', 'staged.txt')

        const before = execFileSync('git', ['status', '--porcelain'], {
            cwd: root,
            encoding: 'utf8',
        })
        const output = await runIn(root, [])

        expect(output).toContain('changeset (slug: wacky-walker)')
        expect(output).toContain('gbt-workflow commit')
        expect(
            execFileSync('git', ['status', '--porcelain'], {
                cwd: root,
                encoding: 'utf8',
            }),
        ).toBe(before)
    })

    it('emits JSON on request', async () => {
        const { git, root } = makeRepo()

        git('switch', '-q', '-c', 'changeset/wacky-walker')

        const parsed: unknown = JSON.parse(await runIn(root, ['--json']))

        expect(parsed).toMatchObject({
            facts: { identity: { mode: 'changeset', slug: 'wacky-walker' } },
        })
    })

    it('renders a pull request plan without mutating the repository', async () => {
        const { git, root } = makeRepo()

        git('switch', '-q', '-c', 'changeset/wacky-walker')
        const before = execFileSync('git', ['status', '--porcelain'], {
            cwd: root,
            encoding: 'utf8',
        })

        const output = await runIn(root, ['pr'])

        expect(output).toContain('Pull request plan')
        expect(output).toContain('changeset: wacky-walker')
        expect(output).toContain('changeset/wacky-walker')
        expect(
            execFileSync('git', ['status', '--porcelain'], {
                cwd: root,
                encoding: 'utf8',
            }),
        ).toBe(before)
    })

    it('renders a safely copyable gh command', async () => {
        const { git, root } = makeRepo()

        git('switch', '-q', '-c', 'release/wacky-walker')

        const output = await runIn(root, ['pr', '--command'])

        expect(output).toContain('gh pr create')
        expect(output).toContain("--base 'main'")
        expect(output).toContain("--head 'release/wacky-walker'")
    })
})
