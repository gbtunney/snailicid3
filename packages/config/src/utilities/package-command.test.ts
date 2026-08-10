import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { main } from './package-command.js'

describe('snail-package command', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('prints the resolved package manager', () => {
        const repoRoot = mkdtempSync(path.join(tmpdir(), 'package-command-'))
        const previousCwd = process.cwd()

        try {
            writeFileSync(
                path.join(repoRoot, 'package.json'),
                JSON.stringify({ packageManager: 'npm@11.0.0' }),
            )
            process.chdir(repoRoot)

            const log = vi.spyOn(console, 'log').mockImplementation(() => {})
            main(['manager'])

            expect(log).toHaveBeenCalledWith('npm')
        } finally {
            process.chdir(previousCwd)
            rmSync(repoRoot, { force: true, recursive: true })
        }
    })

    it('prints command help', () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {})

        main(['--help'])

        expect(log.mock.calls.flat().join('\n')).toContain(
            'snail-package exec <binary>',
        )
    })

    it('rejects unknown commands', () => {
        expect(() => {
            main(['unknown'])
        }).toThrow('Unknown command: unknown')
    })
})
