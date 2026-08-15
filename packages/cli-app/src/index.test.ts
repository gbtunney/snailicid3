import { describe, expect, it } from 'vitest'
import {
    commonFlagsSchema,
    fsPath,
    fsTypedPath,
    getColorAnsiInstance,
    initApp,
    initializeApp,
    kvPair,
    section,
    stripAnsi,
    styleText,
    table,
    terminalLink,
    wrapSchema,
} from './index.js'

describe('@snailicid3/cli-app exports', () => {
    it('exports the public CLI building blocks', () => {
        expect(commonFlagsSchema).toBeDefined()
        expect(initApp).toBe(initializeApp)
        expect(wrapSchema(commonFlagsSchema)).toBe(commonFlagsSchema)
    })

    it('re-exports the curated terminal and colour surface', () => {
        // Curated, not raw Ansis: these are the helpers that honour the logger's colour handling.
        expect(stripAnsi(styleText('done', 'cyan'))).toBe('done')
        expect(stripAnsi(kvPair('Branch', 'changeset/x'))).toContain(
            'changeset/x',
        )
        expect(stripAnsi(section('Heading'))).toContain('Heading')
        expect(typeof getColorAnsiInstance).toBe('function')
        expect(typeof terminalLink).toBe('function')
        expect(typeof table).toBe('function')
    })

    it('re-exports the node-utils filesystem schemas', () => {
        expect(fsPath().safeParse('./package.json').success).toBe(true)
        // Typed path options are what the example CLI depends on `fsTypedPath` for.
        expect(
            fsTypedPath('file', { exists: true }).safeParse(
                './does-not-exist.json',
            ).success,
        ).toBe(false)
    })
})
