import { describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { main } from './affected.js'

function captureConsoleLog(fn: () => void): string {
    const lines: Array<string> = []

    const spy = vi.spyOn(console, 'log').mockImplementation((...args) => {
        lines.push(args.map(String).join(' '))
    })

    try {
        fn()
    } finally {
        spy.mockRestore()
    }

    return lines.join('\n').trim()
}

describe('scope-affected', () => {
    it('prints package scopes from a changeset file', () => {
        const tempDirectory = mkdtempSync(
            path.join(tmpdir(), 'scope-affected-'),
        )
        const changesetPath = path.join(tempDirectory, 'changeset.md')

        try {
            writeFileSync(
                changesetPath,
                [
                    '---',
                    "'@snailicid3/config': patch",
                    "'@snailicid3/node-utils': minor",
                    '---',
                    '',
                    'summary',
                ].join('\n'),
            )

            const output = captureConsoleLog(() => {
                main(['--changeset-only', changesetPath])
            })

            expect(output).toBe('config,node-utils')
        } finally {
            rmSync(tempDirectory, { force: true, recursive: true })
        }
    })

    it('can keep package prefixes for changeset scopes', () => {
        const tempDirectory = mkdtempSync(
            path.join(tmpdir(), 'scope-affected-prefixed-'),
        )
        const changesetPath = path.join(tempDirectory, 'changeset.md')

        try {
            writeFileSync(
                changesetPath,
                ['---', "'@snailicid3/config': patch", '---'].join('\n'),
            )

            const output = captureConsoleLog(() => {
                main(['--changeset-only', changesetPath, '--keep-prefix'])
            })

            expect(output).toBe('@snailicid3/config')
        } finally {
            rmSync(tempDirectory, { force: true, recursive: true })
        }
    })
})
