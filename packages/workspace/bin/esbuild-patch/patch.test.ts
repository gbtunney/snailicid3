import { afterEach, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import {
    chmodSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const patchScript = path.resolve(import.meta.dirname, 'patch.sh')
// These tests launch several Bash subprocesses. Full Nx coverage runs execute test files in
// parallel, and process startup on the supported older Mac can exceed Vitest's unit-test timeout.
const shellIntegrationTimeout = 30_000
const temporaryDirectories: Array<string> = []

function executable(filePath: string, contents: string): void {
    writeFileSync(filePath, contents)
    chmodSync(filePath, 0o755)
}

function fixture(options: { failBuild?: boolean } = {}) {
    const root = mkdtempSync(path.join(tmpdir(), 'gbt-patch-test-'))
    temporaryDirectories.push(root)
    const consumer = path.join(root, 'consumer')
    const tools = path.join(root, 'tools')
    const packageDirectory = path.join(
        consumer,
        'node_modules/.pnpm/@esbuild+darwin-x64@0.28.2/node_modules/@esbuild/darwin-x64',
    )
    const target = path.join(packageDirectory, 'bin/esbuild')
    const log = path.join(root, 'build.log')
    mkdirSync(path.dirname(target), { recursive: true })
    mkdirSync(tools)
    writeFileSync(
        path.join(packageDirectory, 'package.json'),
        JSON.stringify({ version: '0.28.2' }),
    )
    executable(target, '#!/usr/bin/env bash\necho original\n')

    executable(
        path.join(tools, 'git'),
        `#!/usr/bin/env bash
if [[ "$1" == "-C" ]]; then printf '%s\\n' "$PWD"; exit 0; fi
printf 'clone\\n' >> "${log}"
destination="\${@: -1}"
mkdir -p "$destination"
printf '0.28.2\\n' > "$destination/VERSION"
`,
    )
    executable(
        path.join(tools, 'go'),
        options.failBuild
            ? '#!/usr/bin/env bash\nexit 42\n'
            : `#!/usr/bin/env bash
if [[ "$1" == "version" ]]; then
    echo "go version go1.20.14 darwin/amd64"
    exit 0
fi
printf 'build\\n' >> "${log}"
while [[ "$#" -gt 0 ]]; do
    if [[ "$1" == "-o" ]]; then output="$2"; shift 2; else shift; fi
done
version="$(cat VERSION)"
printf '#!/usr/bin/env bash\\necho %s\\n' "$version" > "$output"
chmod 755 "$output"
`,
    )

    const environment = {
        ...process.env,
        GBT_PATCH_CWD: consumer,
        GBT_PATCH_TEST_ALLOW_CI: '1',
        GBT_PATCH_TEST_ARCHITECTURE: 'x86_64',
        GBT_PATCH_TEST_CACHE_ROOT: path.join(root, 'cache'),
        GBT_PATCH_TEST_PLATFORM: 'Darwin',
        PATH: `${tools}:${process.env.PATH ? process.env.PATH : ''}`,
    }

    return { environment, log, root, target }
}

function run(environment: NodeJS.ProcessEnv): void {
    execFileSync('bash', [patchScript], {
        env: environment,
        stdio: 'pipe',
    })
}

afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
        rmSync(directory, { force: true, recursive: true })
    }
})

describe('gbt-patch local build cache', () => {
    it(
        'skips in CI without touching the installed binary',
        () => {
            const test = fixture()
            run({
                ...test.environment,
                CI: 'true',
                GBT_PATCH_TEST_ALLOW_CI: '',
            })

            expect(readFileSync(test.target, 'utf8')).toContain('echo original')
            expect(existsSync(test.log)).toBe(false)
        },
        shellIntegrationTimeout,
    )

    it(
        'builds, verifies, caches, and installs a missing patch',
        () => {
            const test = fixture()
            run(test.environment)

            expect(
                execFileSync(test.target, ['--version'], {
                    encoding: 'utf8',
                }).trim(),
            ).toBe('0.28.2')
            const cacheDirectory = path.join(
                test.root,
                'cache/0.28.2/catalina-v1/Darwin/x86_64',
            )
            expect(existsSync(path.join(cacheDirectory, 'esbuild'))).toBe(true)
            expect(
                readFileSync(path.join(cacheDirectory, 'complete'), 'utf8'),
            ).toMatch(/sha256=[a-f\d]{64}/u)
        },
        shellIntegrationTimeout,
    )

    it(
        'reuses a valid cache on repeated runs',
        () => {
            const test = fixture()
            run(test.environment)
            run(test.environment)

            expect(
                readFileSync(test.log, 'utf8').match(/^build$/gmu),
            ).toHaveLength(1)
            expect(
                readFileSync(test.log, 'utf8').match(/^clone$/gmu),
            ).toHaveLength(1)
        },
        shellIntegrationTimeout,
    )

    it(
        'does not replace the installed binary when the build fails',
        () => {
            const test = fixture({ failBuild: true })

            expect(() => {
                run(test.environment)
            }).toThrow()
            expect(readFileSync(test.target, 'utf8')).toContain('echo original')
        },
        shellIntegrationTimeout,
    )
})
