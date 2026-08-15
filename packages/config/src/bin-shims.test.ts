import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'

const packageRoot = new URL('../', import.meta.url)
const manifest = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { bin: Record<string, string> }
const rootManifest = JSON.parse(
    readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
) as { devDependencies: Record<string, string> }

describe('temporary CLI compatibility shims', () => {
    for (const [command, target] of Object.entries(manifest.bin)) {
        test(`${command} invokes the packaged helper through bash`, () => {
            const contents = readFileSync(new URL(target, packageRoot), 'utf8')

            expect(contents).toContain(
                'exec bash "$(dirname "$0")/../package-bin.sh"',
            )
        })
    }

    test('root installs only the shim package while compatibility bins overlap', () => {
        expect(rootManifest.devDependencies).not.toHaveProperty(
            '@snailicid3/logger',
        )
        expect(rootManifest.devDependencies).not.toHaveProperty(
            '@snailicid3/workspace',
        )
    })
})
