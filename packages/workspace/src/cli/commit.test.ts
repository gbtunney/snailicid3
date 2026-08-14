import { beforeEach, describe, expect, it, vi } from 'vitest'
import { formatScopeEvidence, main, resolveInputFiles } from './commit.js'

async function captureConsoleLog(fn: () => Promise<void>): Promise<string> {
    const lines: Array<string> = []

    const spy = vi.spyOn(console, 'log').mockImplementation((...args) => {
        lines.push(args.map(String).join(' '))
    })

    try {
        await fn()
    } finally {
        spy.mockRestore()
    }

    return lines.join('\n').trim()
}

async function captureStderr(fn: () => Promise<void>): Promise<string> {
    const chunks: Array<string> = []

    const spy = vi
        .spyOn(process.stderr, 'write')
        .mockImplementation((chunk: unknown) => {
            chunks.push(String(chunk))
            return true
        })

    try {
        await fn()
    } finally {
        spy.mockRestore()
    }

    return chunks.join('').trim()
}

describe('scope-commit messages', () => {
    beforeEach(() => {
        process.env.SCOPE_COMMIT_SKIP_COMMITLINT = '1'
    })

    it('prints a message with a shortened package scope', async () => {
        const output = await captureConsoleLog(async () => {
            await main([
                '--message',
                'chore',
                'test scope message',
                'packages/config/package.json',
            ])
        })

        expect(output).toBe('chore(config): test scope message')
    }, 15_000)

    it('prints a message with the full package scope when keepPrefix=true', async () => {
        const output = await captureConsoleLog(async () => {
            await main([
                '--message',
                'chore',
                'test scope message',
                '--keep-prefix',
                'packages/config/package.json',
            ])
        })

        expect(output).toBe('chore(@snailicid3/config): test scope message')
    })

    it('does not cut trailing characters from color/logger scopes', async () => {
        const colorOutput = await captureConsoleLog(async () => {
            await main([
                '--message',
                'chore',
                'test',
                'packages/color/package.json',
            ])
        })

        const loggerOutput = await captureConsoleLog(async () => {
            await main([
                '--message',
                'chore',
                'test',
                'packages/logger/package.json',
            ])
        })

        expect(colorOutput).toBe('chore(color): test')
        expect(loggerOutput).toBe('chore(logger): test')
    })

    it('prints a multi-scope message for multiple package paths', async () => {
        const output = await captureConsoleLog(async () => {
            await main([
                '--message',
                'chore',
                'test scope message',
                'packages/config/package.json',
                'packages/node-utils/package.json',
            ])
        })

        expect(output).toBe('chore(config,node-utils): test scope message')
    })

    it('maps GitHub workflow paths to actions', async () => {
        const output = await captureConsoleLog(async () => {
            await main([
                '--message',
                'chore',
                'test scope message',
                '.github/workflows/call-pipeline.yml',
            ])
        })

        expect(output).toBe('chore(actions): test scope message')
    })

    it('can use an explicit scope for generated commits', async () => {
        const output = await captureConsoleLog(async () => {
            await main([
                '--message',
                'chore',
                'test scope message',
                '--scope',
                'config',
            ])
        })

        expect(output).toBe('chore(config): test scope message')
    })

    it('uses root when an explicit path is unmatched', async () => {
        const output = await captureConsoleLog(async () => {
            await main(['README.md'])
        })

        expect(output).toBe('root')
    })

    it('prints scopes as a list', async () => {
        const output = await captureConsoleLog(async () => {
            await main([
                '--list',
                'packages/config/package.json',
                'packages/logger/package.json',
            ])
        })

        expect(output).toBe('config\nlogger')
    })

    it('writes verbose evidence to stderr, keeping stdout parseable', async () => {
        let stdout = ''

        const stderr = await captureStderr(async () => {
            stdout = await captureConsoleLog(async () => {
                await main([
                    '--verbose',
                    'packages/logger/src/logger.ts',
                    'README.md',
                ])
            })
        })

        expect(stderr).toContain('explicit files: 2')
        expect(stderr).toContain('logger\n  packages/logger/src/logger.ts')
        expect(stderr).toContain('unmatched/root\n  README.md')
        expect(stderr).toContain('detected: logger')

        // Stdout carries only the scope value callers capture.
        expect(stdout).toBe('logger')
    })

    it('reports scopes the explicit override drops', async () => {
        const stderr = await captureStderr(async () => {
            await captureConsoleLog(async () => {
                await main([
                    '--verbose',
                    '--scope',
                    'config',
                    'packages/logger/src/logger.ts',
                ])
            })
        })

        expect(stderr).toContain('detected: logger')
        expect(stderr).toContain('override: config')
        expect(stderr).toContain('dropped by override: logger')
    })

    it('rejects the removed skip-lint-staged flag', async () => {
        await expect(
            main([
                '--message',
                'chore',
                'test scope message',
                '--skip-lint-staged',
                'packages/config/package.json',
            ]),
        ).rejects.toThrow('Unknown argument: --skip-lint-staged')
    })
})

describe('scope-commit file input', () => {
    it('uses explicit paths without reading Git state', () => {
        const getChangedFiles = vi.fn(() => ['from-git.ts'])

        expect(
            resolveInputFiles(['explicit.ts'], 'all', getChangedFiles),
        ).toEqual(['explicit.ts'])
        expect(getChangedFiles).not.toHaveBeenCalled()
    })

    it('requests staged files by default', () => {
        const getChangedFiles = vi.fn(() => ['staged.ts'])

        expect(resolveInputFiles([], 'staged', getChangedFiles)).toEqual([
            'staged.ts',
        ])
        expect(getChangedFiles).toHaveBeenCalledWith({
            includeStaged: true,
            includeUnstaged: false,
            includeUntracked: false,
        })
    })

    it('requests all current changes in all mode', () => {
        const getChangedFiles = vi.fn(() => [
            'staged.ts',
            'unstaged.ts',
            'untracked.ts',
        ])

        expect(resolveInputFiles([], 'all', getChangedFiles)).toEqual([
            'staged.ts',
            'unstaged.ts',
            'untracked.ts',
        ])
        expect(getChangedFiles).toHaveBeenCalledWith({
            includeStaged: true,
            includeUnstaged: true,
            includeUntracked: true,
        })
    })
})

describe('scope evidence formatting', () => {
    it('formats classification evidence without rerunning matching', () => {
        expect(
            formatScopeEvidence(
                ['packages/config/a.ts', 'README.md'],
                {
                    matches: { config: ['packages/config/a.ts'] },
                    scopes: ['config'],
                    unmatched: ['README.md'],
                },
                'all',
            ),
        ).toBe(
            [
                'all files: 2',
                '',
                'config',
                '  packages/config/a.ts',
                '',
                'unmatched/root',
                '  README.md',
                '',
                'detected: config',
            ].join('\n'),
        )
    })
})
