import { build } from 'tsdown'
import { afterEach, describe, expect, test } from 'vitest'
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import buildConfigManifest from './../../../package.json' with { type: 'json' }
import { toTsdownConfigs } from './to-tsdown.js'
import { defineBuildPlan } from '../../build/plan.js'

/**
 * The #228 boundary: building emits artifacts, and validating them is Doctor's separate, explicit step.
 *
 * These are safeguards rather than behaviour, so they are asserted as facts about the generated config rather than
 * through it — a default that happens to agree today is not the same as a decision this adapter states.
 */
const PACKAGE_VALIDATORS = ['attw', 'publint', 'unused'] as const

const temporaryRoots: Array<string> = []

afterEach(() => {
    for (const root of temporaryRoots.splice(0)) {
        rmSync(root, { force: true, recursive: true })
    }
})

describe('build-config never performs package validation', () => {
    test('forces every validator off on every generated config', () => {
        // Build-config's own manifest and entries, so the assertion covers configs that really ship.
        const plan = defineBuildPlan(buildConfigManifest, {
            entries: [
                { key: '*', sourceFile: 'index.ts' },
                { key: './vitest', sourceFile: 'vitest/index.ts' },
            ],
        })

        const configs = toTsdownConfigs(plan)

        expect(configs).toHaveLength(2)
        for (const config of configs) {
            for (const validator of PACKAGE_VALIDATORS) {
                // `false`, not merely absent: absence defers the answer to whatever tsdown defaults to.
                expect(config[validator]).toBe(false)
            }
        }
    })

    test('owns none of the validation tools it refuses to run', () => {
        const declared = {
            ...buildConfigManifest.dependencies,
            ...buildConfigManifest.devDependencies,
            ...buildConfigManifest.peerDependencies,
        }

        // Doctor owns publint and @arethetypeswrong/core. build-config depending on them would make the
        // separation a convention rather than a fact about the dependency graph.
        const declaredNames = Object.keys(declared)
        expect(declaredNames).not.toContain('publint')
        expect(declaredNames).not.toContain('@arethetypeswrong/core')
        expect(declaredNames).not.toContain('unplugin-unused')
    })

    test('carries no build-plan lint option, and reporting no longer follows one', () => {
        const plan = defineBuildPlan(manifest(), {
            // The historical `lint` option drove tsdown's report and nothing else. It is gone, so the schema
            // strips it rather than routing it anywhere.
            entries: [{ key: '*', lint: false } as never],
            root: { outputDir: './dist', sourceDir: './src' },
        })

        expect(plan.entries[0]).not.toHaveProperty('lint')
        // Reporting is now the adapter's own decision. Forced off rather than dropped, because tsdown defaults it
        // on and every build plan here had turned it off for the memory errors in #82.
        expect(toTsdownConfigs(plan)[0]?.report).toBe(false)
    })

    test('still routes canonical package identity into the banner', () => {
        const plan = defineBuildPlan(manifest(), {
            entries: [{ key: '*', output_formats: ['esm'] }],
            root: { outputDir: './dist', sourceDir: './src' },
        })

        // Identity reaches the artifact through the banner, and that path is unchanged by the safeguards.
        expect(toTsdownConfigs(plan)[0]?.banner).toContain('@fixture/manifest')
        expect(toTsdownConfigs(plan)[0]?.banner).toContain('9.9.9')
    })
})

describe('build-config never rewrites the package manifest', () => {
    test('leaves a hand-authored exports map byte-identical through a real build', async () => {
        const root = createSourcePackage()
        const manifestPath = path.join(root, 'package.json')
        const before = readFileSync(manifestPath, 'utf8')

        await build({ ...adapterConfig(root), config: false, cwd: root })

        // Pin that the build actually ran: an unchanged manifest proves nothing if nothing was built.
        expect(existsSync(path.join(root, 'dist/index.js'))).toBe(true)
        // The manifest is an input to the build, never an output of it.
        expect(readFileSync(manifestPath, 'utf8')).toBe(before)
    }, 120_000)

    test('would lose hand-authored export conditions if tsdown owned the manifest', async () => {
        const root = createSourcePackage()
        const manifestPath = path.join(root, 'package.json')

        await build({
            ...adapterConfig(root),
            config: false,
            cwd: root,
            // The safeguard is load-bearing rather than decorative: this is what it prevents.
            exports: true,
        })

        const rewritten: unknown = JSON.parse(
            readFileSync(manifestPath, 'utf8'),
        )
        const exportsField = (rewritten as { exports: Record<string, unknown> })
            .exports
        // Tsdown replaces the map wholesale — the hand-authored `types` condition does not survive.
        expect(exportsField['.']).not.toEqual({
            import: './hand/authored.js',
            types: './hand/authored.d.ts',
        })
    }, 120_000)
})

/** The adapter's own config for a fixture package, used unmodified so the build exercises what ships. */
function adapterConfig(root: string) {
    const plan = defineBuildPlan(readManifest(root), {
        entries: [{ key: '*', logLevel: 'silent', output_formats: ['esm'] }],
        root: {
            outputDir: path.join(root, 'dist'),
            sourceDir: path.join(root, 'src'),
        },
    })
    const [config] = toTsdownConfigs(plan)
    return config
}

function createSourcePackage(): string {
    const root = mkdtempSync(path.join(tmpdir(), 'build-config-manifest-'))
    temporaryRoots.push(root)
    mkdirSync(path.join(root, 'src'), { recursive: true })
    writeFileSync(path.join(root, 'src/index.ts'), 'export const value = 42\n')
    writeFileSync(
        path.join(root, 'package.json'),
        `${JSON.stringify(
            manifest({
                exports: {
                    '.': {
                        import: './hand/authored.js',
                        types: './hand/authored.d.ts',
                    },
                },
            }),
            undefined,
            2,
        )}\n`,
    )
    return root
}

/** The identity fields `schemaBasePackage` requires, so the fixture exercises the real parse path. */
function manifest(
    extra: Record<string, unknown> = {},
): Record<string, unknown> {
    return {
        author: { email: 'fixture@example.com', name: 'Fixture Author' },
        description: 'A fixture package used to pin build-config safeguards.',
        license: 'MIT',
        name: '@fixture/manifest',
        private: false,
        repository: {
            type: 'git',
            url: 'https://github.com/fixture/manifest.git',
        },
        type: 'module',
        version: '9.9.9',
        ...extra,
    }
}

function readManifest(root: string): Record<string, unknown> {
    return JSON.parse(
        readFileSync(path.join(root, 'package.json'), 'utf8'),
    ) as Record<string, unknown>
}
