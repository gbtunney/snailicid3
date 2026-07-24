import build from './build.js'
import { defineNxConfig, type NxTargets } from '../api-functions.js'
import { prefixTargets, selectTargets } from '../utilities.js'

// Reuse the shared build recipes under the root:* namespace. prefixTargets
// rewires the intra-set, same-project dependsOn (build -> build:ts becomes
// root:build -> root:build:ts) so the aggregator wiring stays consistent.
const derived = prefixTargets(
    'root',
    selectTargets(build.targetDefaults ?? {}, ['build', 'build:ts']),
)

// Root:build inherits the rewired dependsOn from the shared recipe; the root
// project only aggregates (no library `inputs`).
const { inputs: _rootBuildInputs, ...rootBuild } = derived['root:build'] ?? {}

// The workspace-root project compiles the top-level tsconfig.json (its own
// *.ts entrypoints), not each package's tsconfig.build.json, so build/clean
// commands, inputs and outputs differ from the library recipes.
const rootTargets: NxTargets = {
    'fix:md': {
        // (fix) mutating -> uncached
        cache: false,
        command:
            "pnpm exec prettier './**/*.md' '!**/*.api.md' --write && pnpm exec markdownlint-cli2 --fix",
        dependsOn: ['root:build:ts'],
        inputs: ['{projectRoot}/**/*.md'],
        options: { cwd: '{projectRoot}' },
    },
    // Root-only markdown targets (no prefix collision, kept as-is).
    'lint:md': {
        cache: true,
        command: 'pnpm exec markdownlint-cli2',
        dependsOn: ['root:build:ts'],
        inputs: ['{projectRoot}/**/*.md'],
        options: { cwd: '{workspaceRoot}' },
    },
    'root:build': rootBuild,
    'root:build:ts': {
        cache: true,
        command: 'tsc --build tsconfig.json',
        dependsOn: [],
        inputs: [
            '{projectRoot}/*.ts',
            '{projectRoot}/*.mts',
            '{projectRoot}/*.cts',
            '{projectRoot}/tsconfig.json',
        ],
        options: { cwd: '{projectRoot}' },
        outputs: [
            '{projectRoot}/*.js',
            '{projectRoot}/*.mjs',
            '{projectRoot}/*.cjs',
        ],
    },
    'root:clean': {
        cache: false,
        dependsOn: ['root:clean:ts'],
    },
    'root:clean:ts': {
        cache: false,
        command: 'tsc --build --clean tsconfig.json',
        options: { cwd: '{projectRoot}' },
    },
    'root:fix': {
        // (fix) mutating -> uncached
        cache: false,
        command:
            "pnpm exec prettier --write '**/*' '!{packages,apps}/**' '!**/*.api.md' --ignore-unknown --no-error-on-unmatched-pattern && pnpm exec eslint --config eslint.config.ts ./*.ts ./*.mts ./*.cts --fix --no-error-on-unmatched-pattern",
        dependsOn: ['root:build:ts'],
        options: { cwd: '{projectRoot}' },
    },
    'root:lint': {
        cache: true,
        command:
            "prettier --check '**/*' '!{packages,apps}/**' '!**/*.api.md' --ignore-unknown --no-error-on-unmatched-pattern && eslint --config eslint.config.ts ./*.ts ./*.mts ./*.cts --no-error-on-unmatched-pattern",
        dependsOn: ['root:build:ts'],
        options: { cwd: '{projectRoot}' },
    },
}

export default defineNxConfig({ targetDefaults: rootTargets })
