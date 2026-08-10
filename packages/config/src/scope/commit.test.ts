import { beforeEach, describe, expect, it, vi } from 'vitest'
import { main } from './commit.js'

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
