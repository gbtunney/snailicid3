import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const bootstrapScript = path.resolve(import.meta.dirname, 'bootstrap.sh')
const loggerScript = path.resolve(import.meta.dirname, 'snail-sh-logger.sh')
const scratchScript = path.resolve(import.meta.dirname, 'snail-sh-test.sh')
const configManifest = path.resolve(
    import.meta.dirname,
    '../../config/package.json',
)

describe('B11 workspace shell bootstrap', () => {
    it('loads the small logging floor required by shipped shell commands', () => {
        const functionNames = [
            'critical',
            'die',
            'err',
            'header',
            'info',
            'kabob',
            'kv_pair',
            'line',
            'log',
            'rule',
            'section',
            'skipped',
            'spacer',
            'status_pair',
            'step',
            'success',
            'warn',
        ]
        const shellProgram = `
BOOTSTRAP_CALLER_SOURCE=${JSON.stringify(bootstrapScript)}
. ${JSON.stringify(bootstrapScript)}
${functionNames.map((functionName) => `declare -F ${functionName} >/dev/null`).join('\n')}
success ready
`
        const output = execFileSync('bash', ['-c', shellProgram], {
            encoding: 'utf8',
        })

        expect(output).toContain('[success] ✓ ready')
    })

    it('does not restore the removed parallel logger surface', () => {
        const loggerSource = readFileSync(loggerScript, 'utf8')

        expect(loggerSource.split('\n').length).toBeLessThan(300)
        expect(loggerSource).not.toContain('grey_ramp()')
        expect(loggerSource).not.toContain('Command dispatcher')
        expect(loggerSource).not.toContain('resolve_kabob_side_widths()')
    })
})

describe('B12 workspace shell scratch removal', () => {
    it('does not ship or reference the old logger scratch script', () => {
        const manifest = JSON.parse(
            readFileSync(configManifest, 'utf8'),
        ) as Readonly<{ scripts?: Readonly<Record<string, string>> }>

        expect(existsSync(scratchScript)).toBe(false)
        expect(manifest.scripts?.['demo:logger']).toBeUndefined()
    })
})
