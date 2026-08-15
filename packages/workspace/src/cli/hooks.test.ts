import { describe, expect, it, vi } from 'vitest'

import { main } from './hooks.js'

describe('workspace-hook CLI', () => {
    it('prints help without running a hook', () => {
        const output = vi.spyOn(console, 'log').mockImplementation(() => {})

        main(['--help'])

        expect(output).toHaveBeenCalledWith(
            expect.stringContaining('Usage:\n  workspace-hook pre-commit'),
        )
        output.mockRestore()
    })
})
