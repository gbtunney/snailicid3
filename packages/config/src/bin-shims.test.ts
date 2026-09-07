import { describe, expect, test } from 'vitest'
import { execFileSync } from 'node:child_process'
import {
    chmodSync,
    cpSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    symlinkSync,
    writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const packageRoot = new URL('../', import.meta.url)
const manifest = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { bin: Record<string, string> }
const rootManifest = JSON.parse(
    readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
) as { devDependencies: Record<string, string> }

describe('temporary CLI compatibility shims', () => {
    for (const [command, target] of Object.entries(manifest.bin)) {
        test(`${command} invokes the packaged helper through its physical package path`, () => {
            const contents = readFileSync(new URL(target, packageRoot), 'utf8')

            expect(contents).toContain('while [[ -L "$SOURCE" ]]')
            expect(contents).toContain(
                'exec bash "$SCRIPT_DIR/../package-bin.sh"',
            )
        })
    }

    test('delegates through a package-manager .bin symlink', () => {
        const consumerRoot = mkdtempSync(
            path.join(tmpdir(), 'snailicid3-config-bin-shim-'),
        )
        const installedConfigRoot = path.join(
            consumerRoot,
            'node_modules',
            '@snailicid3',
            'config',
        )
        const installedLoggerRoot = path.join(
            consumerRoot,
            'node_modules',
            '@snailicid3',
            'logger',
        )

        mkdirSync(path.join(consumerRoot, 'node_modules', '.bin'), {
            recursive: true,
        })
        cpSync(
            new URL('../bin', import.meta.url),
            path.join(installedConfigRoot, 'bin'),
            {
                recursive: true,
            },
        )
        writeFileSync(
            path.join(installedConfigRoot, 'package.json'),
            JSON.stringify({ name: '@snailicid3/config' }),
        )
        mkdirSync(path.join(installedLoggerRoot, 'bin'), { recursive: true })
        writeFileSync(
            path.join(installedLoggerRoot, 'package.json'),
            JSON.stringify({
                bin: { 'snail-sh': './bin/snail-sh.sh' },
                name: '@snailicid3/logger',
            }),
        )
        const ownerBin = path.join(installedLoggerRoot, 'bin', 'snail-sh.sh')
        writeFileSync(
            ownerBin,
            '#!/usr/bin/env bash\nprintf "owner:%s\\n" "$*"\n',
        )
        chmodSync(ownerBin, 0o755)

        const binLink = path.join(
            consumerRoot,
            'node_modules',
            '.bin',
            'snail-sh',
        )
        symlinkSync(
            path.join(
                '..',
                '@snailicid3',
                'config',
                'bin',
                'workspace',
                'snail-sh.sh',
            ),
            binLink,
        )

        expect(
            execFileSync('bash', [binLink, 'hello', 'world'], {
                encoding: 'utf8',
            }),
        ).toBe('owner:hello world\n')
    })

    test('root installs only the shim package while compatibility bins overlap', () => {
        expect(rootManifest.devDependencies).not.toHaveProperty(
            '@snailicid3/logger',
        )
        expect(rootManifest.devDependencies).not.toHaveProperty(
            '@snailicid3/workspace',
        )
    })
})
