import { spawn, spawnSync } from 'node:child_process'
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { runDoctorWithPackedValidation } from '../packages/doctor/src/doctor.js'
import { createPackCandidate } from '../packages/doctor/src/pack-candidate.js'
import { validatePackedCandidate } from '../packages/doctor/src/packed-validation.js'

type CommandOptions = Readonly<{
    cwd?: string
    env?: NodeJS.ProcessEnv
}>

type PackageManifest = Readonly<{
    bin?: Record<string, string> | string
    dependencies?: Record<string, string>
    exports?: unknown
    name: string
    peerDependencies?: Record<string, string>
    version: string
}>

type PackageSpec = Readonly<{
    name: string
    packageRoot: string
    reason: string
    role: 'candidate' | 'seed'
    version: string
}>

type PackedPackage = PackageSpec &
    Readonly<{
        manifest: PackageManifest
        tarball: string
    }>

const EXACT_CANDIDATE_HEAD = '57ef871e331762451e031424b9082a0a992549ae'
const SCOPE_REGISTRY = '@snailicid3:registry'
const args = new Set(process.argv.slice(2))
const allowDirty = args.has('--allow-dirty')
const skipBuild = args.has('--skip-build')

const root = path.resolve(new URL('..', import.meta.url).pathname)

const candidatePackages: ReadonlyArray<PackageSpec> = [
    {
        name: '@snailicid3/workspace',
        packageRoot: 'packages/workspace',
        reason: 'Current PR #270 production release candidate and Actions release-contract provider.',
        role: 'candidate',
        version: '0.2.0',
    },
    {
        name: '@snailicid3/config',
        packageRoot: 'packages/config',
        reason: 'Current PR #270 production release candidate; delegates compatibility bins through Workspace.',
        role: 'candidate',
        version: '0.3.1',
    },
    {
        name: '@snailicid3/storybook-config',
        packageRoot: 'packages/storybook-config',
        reason: 'Current PR #270 production release candidate; depends on Config.',
        role: 'candidate',
        version: '0.1.2',
    },
    {
        name: '@snailicid3/build-config',
        packageRoot: 'packages/build-config',
        reason: 'Current PR #270 production release candidate.',
        role: 'candidate',
        version: '0.2.0',
    },
]

const seedPackages: ReadonlyArray<PackageSpec> = [
    {
        name: '@snailicid3/logger',
        packageRoot: 'packages/logger',
        reason: 'Already-published Snailicid3 dependency of Workspace and Config.',
        role: 'seed',
        version: '0.1.0',
    },
    {
        name: '@snailicid3/node-utils',
        packageRoot: 'packages/node-utils',
        reason: 'Already-published Snailicid3 dependency of Workspace, Config, Build Config and Logger.',
        role: 'seed',
        version: '0.2.0',
    },
    {
        name: '@snailicid3/utils',
        packageRoot: 'packages/utils',
        reason: 'Already-published Snailicid3 dependency required by Workspace and Node Utils.',
        role: 'seed',
        version: '0.1.0',
    },
    {
        name: '@snailicid3/types',
        packageRoot: 'packages/types',
        reason: 'Already-published Snailicid3 baseline dependency required by Utils and Color.',
        role: 'seed',
        version: '0.0.3',
    },
    {
        name: '@snailicid3/color',
        packageRoot: 'packages/color',
        reason: 'Already-published Snailicid3 dependency required by Logger.',
        role: 'seed',
        version: '0.0.7',
    },
]

const allPackages = [...candidatePackages, ...seedPackages]

function assertCandidateHead(): void {
    const head = run('git', ['rev-parse', 'HEAD'], { cwd: root }).stdout.trim()
    if (head !== EXACT_CANDIDATE_HEAD) {
        throw new Error(
            `Expected candidate head ${EXACT_CANDIDATE_HEAD}, found ${head}.`,
        )
    }
}

function assertGitStatusUnchanged(initialStatus: string): void {
    const finalStatus = gitStatus()
    if (finalStatus !== initialStatus) {
        throw new Error(
            [
                'The rehearsal changed the source repository status.',
                'Before:',
                initialStatus || '(clean)',
                'After:',
                finalStatus || '(clean)',
            ].join('\n'),
        )
    }
}

function assertNoWorkspaceProtocol(value: unknown, label: string): void {
    if (typeof value === 'string' && value.includes('workspace:')) {
        throw new Error(`${label} contains unresolved workspace protocol.`)
    }
    if (Array.isArray(value)) {
        value.forEach((item) => {
            assertNoWorkspaceProtocol(item, label)
        })
        return
    }
    if (value !== null && typeof value === 'object') {
        for (const item of Object.values(value)) {
            assertNoWorkspaceProtocol(item, label)
        }
    }
}

function assertPackageVersions(): void {
    for (const spec of allPackages) {
        const manifest = readSourceManifest(spec.packageRoot)
        if (manifest.name !== spec.name || manifest.version !== spec.version) {
            throw new Error(
                `${spec.packageRoot} is ${manifest.name}@${manifest.version}; expected ${spec.name}@${spec.version}.`,
            )
        }
    }
}

function assertSnailicid3ClosureSeeded(
    packages: ReadonlyArray<PackedPackage>,
): void {
    const available = new Set(
        packages.map((pkg) => `${pkg.name}@${pkg.version}`),
    )
    const missing = new Set<string>()

    for (const pkg of packages) {
        for (const [name, range] of Object.entries(
            pkg.manifest.dependencies ?? {},
        )) {
            if (!name.startsWith('@snailicid3/')) continue
            const exact = `${name}@${range.replace(/^[~^]/u, '')}`
            if (!available.has(exact))
                missing.add(`${pkg.name} -> ${name}@${range}`)
        }
    }

    if (missing.size > 0) {
        throw new Error(
            `Missing isolated Snailicid3 dependency seeds:\n${[...missing].join('\n')}`,
        )
    }
}

async function authenticateRegistry(
    registryUrl: string,
    rehearsalRoot: string,
): Promise<string> {
    const userConfig = path.join(rehearsalRoot, 'publish.npmrc')
    const username = 'snailicid3-rehearsal'
    const response = await fetch(
        new URL(`-/user/org.couchdb.user:${username}`, registryUrl),
        {
            body: JSON.stringify({
                email: 'rehearsal@example.invalid',
                name: username,
                password: 'snailicid3-rehearsal-password',
                type: 'user',
            }),
            headers: { 'content-type': 'application/json' },
            method: 'PUT',
        },
    )
    const body = (await response.json()) as { token?: string }
    if (!response.ok || typeof body.token !== 'string') {
        throw new Error(
            `Verdaccio user creation failed with ${response.status.toString()}: ${JSON.stringify(body)}`,
        )
    }
    const tokenHost = registryUrl.replace(/^https?:/u, '')
    writeFileSync(userConfig, npmrc(registryUrl))
    writeFileSync(
        userConfig,
        `${npmrc(registryUrl)}${tokenHost}:_authToken=${body.token}\n`,
    )

    return userConfig
}

async function captureResult<Result>(
    label: string,
    collect: () => Promise<Result> | Result,
): Promise<
    | Readonly<{ detail: string; label: string; status: 'failed' }>
    | (Readonly<{ label: string; status: 'passed' }> & Result)
> {
    try {
        const result = await collect()
        return { ...result, label, status: 'passed' }
    } catch (error) {
        return { detail: describe(error), label, status: 'failed' }
    }
}

function consumerPassedWorkspaceContract(
    result: Awaited<ReturnType<typeof captureResult>>,
): boolean {
    return (
        result.status === 'passed' ||
        result.detail.includes(
            'runtime exports and Workspace release-contract imports',
        )
    )
}

function createConsumerRuntimeTest(): string {
    return `
import assert from 'node:assert/strict'
import {
  createReleasePlan,
  createReleasePreparePlan,
  createReleasePublishPlan,
  createReleaseTagPlan,
  executeReleasePublishPlan,
  releasePlanSchema,
  releasePreparePlanSchema,
  releasePublishPlanSchema,
  releasePublishResultSchema,
  releaseTagPlanSchema,
  renderReleasePlanMarkdown,
  renderReleasePlanTerminal,
} from '@snailicid3/workspace'

const packageInput = {
  doctor: { artifact: 'valid', dependencyClosure: 'valid' },
  gitTag: { name: '@snailicid3/workspace@0.2.0', selected: true },
  intent: { bump: 'minor', reason: 'PR #270 rehearsal', source: 'changesets' },
  name: '@snailicid3/workspace',
  policy: { channel: 'latest', decision: 'selected', reason: 'Explicit release operation' },
  private: false,
  registry: { distTags: {}, registryUrl: 'https://registry.npmjs.org/', state: 'missing' },
  version: '0.2.0',
  versionState: { state: 'current' },
}
const integrity = \`sha512-\${'a'.repeat(86)}==\`
const candidate = {
  artifact: {
    integrity,
    name: '@snailicid3/workspace',
    tarball: 'releases/snailicid3-workspace-0.2.0.tgz',
    version: '0.2.0',
  },
  doctor: { artifact: 'valid', closure: { edges: [], state: 'valid' } },
  name: '@snailicid3/workspace',
}
const selection = ['@snailicid3/workspace']
const plan = createReleasePlan({ packages: [packageInput] })
const prepare = createReleasePreparePlan({
  baseBranch: 'main',
  plan,
  selection,
  slug: 'pr270-rehearsal',
  workingTree: 'clean',
})
const tag = createReleaseTagPlan({
  existingTags: [],
  plan,
  preparedVersions: [{ name: '@snailicid3/workspace', version: '0.2.0' }],
  selection,
})
const publish = createReleasePublishPlan({
  candidates: [candidate],
  channel: 'latest',
  plan,
  selection,
})
const heldPlan = createReleasePlan({
  packages: [{ ...packageInput, policy: { decision: 'held', reason: 'No publish operation selected' } }],
})
const publishResult = executeReleasePublishPlan(createReleasePublishPlan({
  candidates: [candidate],
  channel: 'latest',
  plan: heldPlan,
  selection: [],
}))

for (const [document, schema] of [
  [plan, releasePlanSchema],
  [prepare, releasePreparePlanSchema],
  [tag, releaseTagPlanSchema],
  [publish, releasePublishPlanSchema],
  [publishResult, releasePublishResultSchema],
]) {
  assert.equal(document.schemaVersion, 1)
  assert.equal(schema.safeParse(document).success, true)
  assert.equal(schema.safeParse({ ...document, schemaVersion: 2 }).success, false)
}

assert.match(renderReleasePlanMarkdown(plan), /Release plan/)
assert.match(renderReleasePlanTerminal(plan), /Release plan/)
assert.equal(publishResult.started, false)

await import('@snailicid3/config')
await import('@snailicid3/config/prettier', { with: { type: 'json' } })
await import('@snailicid3/config/markdownlint', { with: { type: 'json' } })
await import('@snailicid3/config/nx-preset.json', { with: { type: 'json' } })
await import('@snailicid3/storybook-config')
await import('@snailicid3/build-config')
await import('@snailicid3/build-config/tsdown')
await import('@snailicid3/build-config/vite')
await import('@snailicid3/build-config/vitest')
await import('@snailicid3/build-config/plan')
await import('@snailicid3/build-config/banner')
`
}

function createConsumerTypeTest(): string {
    return `
import {
  createReleasePlan,
  createReleasePreparePlan,
  createReleasePublishPlan,
  createReleaseTagPlan,
  executeReleasePublishPlan,
  releasePlanSchema,
  releasePreparePlanSchema,
  releasePublishPlanSchema,
  releasePublishResultSchema,
  releaseTagPlanSchema,
  renderReleasePlanMarkdown,
  renderReleasePlanTerminal,
  type ReleasePlan,
} from '@snailicid3/workspace'
import '@snailicid3/config'
import '@snailicid3/storybook-config'
import '@snailicid3/build-config'
import '@snailicid3/build-config/tsdown'
import '@snailicid3/build-config/vite'
import '@snailicid3/build-config/vitest'
import '@snailicid3/build-config/plan'
import '@snailicid3/build-config/banner'

const plan: ReleasePlan = createReleasePlan({ packages: [] })
renderReleasePlanMarkdown(plan)
renderReleasePlanTerminal(plan)
releasePlanSchema.parse(plan)
createReleasePreparePlan({ baseBranch: 'main', plan, selection: [], slug: 'types', workingTree: 'clean' })
createReleaseTagPlan({ existingTags: [], plan, preparedVersions: [], selection: [] })
const publish = createReleasePublishPlan({ candidates: [], channel: 'latest', plan, selection: [] })
executeReleasePublishPlan(publish)
releasePreparePlanSchema.safeParse({})
releasePublishPlanSchema.safeParse({})
releasePublishResultSchema.safeParse({})
releaseTagPlanSchema.safeParse({})
`
}

function describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

async function getOpenPort(): Promise<number> {
    return await new Promise((resolve, reject) => {
        const server = createServer()
        server.once('error', reject)
        server.listen(0, '127.0.0.1', () => {
            const address = server.address()
            if (address === null || typeof address === 'string') {
                reject(
                    new Error('Could not allocate a loopback port.', {
                        cause: address,
                    }),
                )
                return
            }
            server.close(() => {
                resolve(address.port)
            })
        })
    })
}

function gitStatus(): string {
    return run('git', ['status', '--porcelain'], { cwd: root }).stdout.trim()
}

async function main(): Promise<void> {
    const initialStatus = gitStatus()
    if (!allowDirty && initialStatus !== '') {
        throw new Error(
            `The source repository must be clean before rehearsal.\n${initialStatus}`,
        )
    }

    assertCandidateHead()
    assertPackageVersions()

    if (!skipBuild) {
        run('pnpm', ['build'], { cwd: root })
    }

    const rehearsalRoot = mkdtempSync(
        path.join(tmpdir(), 'snailicid3-pr270-rehearsal-'),
    )

    try {
        const tarballRoot = path.join(rehearsalRoot, 'tarballs')
        mkdirSync(tarballRoot, { recursive: true })
        const packed = allPackages.map((spec) => packPackage(spec, tarballRoot))
        assertSnailicid3ClosureSeeded(packed)

        const registry = await startVerdaccio(rehearsalRoot)
        try {
            const publishUserConfig = await authenticateRegistry(
                registry.url,
                rehearsalRoot,
            )
            for (const pkg of packed) {
                publishTarball(
                    pkg,
                    registry.url,
                    rehearsalRoot,
                    publishUserConfig,
                )
            }

            const failures: Array<string> = []
            const npmResult = await captureResult('npm consumer', () =>
                testConsumer({
                    manager: 'npm',
                    registryUrl: registry.url,
                    root: path.join(rehearsalRoot, 'npm-consumer'),
                }),
            )
            const pnpmResult = await captureResult('pnpm consumer', () =>
                testConsumer({
                    manager: 'pnpm',
                    registryUrl: registry.url,
                    root: path.join(rehearsalRoot, 'pnpm-consumer'),
                }),
            )
            const doctorResult = await captureResult('Doctor/artifacts', () =>
                validateDoctorAndArtifacts(packed),
            )
            for (const result of [npmResult, pnpmResult, doctorResult]) {
                if (result.status === 'failed') {
                    failures.push(`${result.label}: ${result.detail}`)
                }
            }
            try {
                assertGitStatusUnchanged(initialStatus)
            } catch (error) {
                failures.push(
                    `source repository cleanliness: ${describe(error)}`,
                )
            }

            const summary = {
                candidateHead: EXACT_CANDIDATE_HEAD,
                doctor: doctorResult,
                npmConsumer: npmResult,
                packed: packed.map(({ name, reason, role, version }) => ({
                    name,
                    reason,
                    role,
                    version,
                })),
                pnpmConsumer: pnpmResult,
                registry: {
                    uplinks: 'disabled',
                    url: registry.url,
                },
                sourceRepository: failures.some((failure) =>
                    failure.startsWith('source repository cleanliness:'),
                )
                    ? 'changed'
                    : 'unchanged',
                workspaceReleaseContract:
                    consumerPassedWorkspaceContract(npmResult) &&
                    consumerPassedWorkspaceContract(pnpmResult)
                        ? 'passed'
                        : 'failed',
            }
            console.log(JSON.stringify(summary, undefined, 2))

            if (failures.length > 0) {
                throw new Error(
                    `Packed-consumer rehearsal failed:\n${failures.join('\n')}`,
                )
            }
        } finally {
            await registry.stop()
        }
    } finally {
        rmSync(rehearsalRoot, { force: true, recursive: true })
    }
}

function npmrc(registryUrl: string): string {
    return [
        `${SCOPE_REGISTRY}=${registryUrl}`,
        'registry=https://registry.npmjs.org/',
        'always-auth=false',
        'audit=false',
        'fund=false',
        '',
    ].join('\n')
}

function packPackage(spec: PackageSpec, destination: string): PackedPackage {
    const result = run(
        'pnpm',
        [
            '--dir',
            path.join(root, spec.packageRoot),
            'pack',
            '--config.ignore-scripts=true',
            '--json',
            '--pack-destination',
            destination,
        ],
        { cwd: root },
    )
    const packReport = JSON.parse(result.stdout) as
        Array<{ filename: string }> | { filename: string }
    const [{ filename }] = Array.isArray(packReport) ? packReport : [packReport]
    const tarball = path.resolve(filename)
    const manifest = readTarballManifest(tarball)

    if (manifest.name !== spec.name || manifest.version !== spec.version) {
        throw new Error(
            `Packed ${manifest.name}@${manifest.version}; expected ${spec.name}@${spec.version}.`,
        )
    }
    assertNoWorkspaceProtocol(manifest, `${manifest.name}@${manifest.version}`)

    return { ...spec, manifest, tarball }
}

function publishTarball(
    pkg: PackedPackage,
    registryUrl: string,
    rehearsalRoot: string,
    userConfig: string,
): void {
    run(
        'npm',
        [
            'publish',
            pkg.tarball,
            '--registry',
            registryUrl,
            '--access',
            'public',
            '--ignore-scripts',
            '--no-audit',
            '--fund=false',
        ],
        {
            cwd: root,
            env: {
                ...process.env,
                npm_config_cache: path.join(rehearsalRoot, 'npm-publish-cache'),
                npm_config_userconfig: userConfig,
            },
        },
    )
}

function readSourceManifest(packageRoot: string): PackageManifest {
    return JSON.parse(
        readFileSync(path.join(root, packageRoot, 'package.json'), 'utf8'),
    ) as PackageManifest
}

function readTarballManifest(tarball: string): PackageManifest {
    const result = run('tar', ['-xOf', tarball, 'package/package.json'], {
        cwd: root,
    })
    return JSON.parse(result.stdout) as PackageManifest
}

function run(
    command: string,
    commandArgs: ReadonlyArray<string>,
    options: CommandOptions = {},
): { stdout: string } {
    const result = spawnSync(command, commandArgs, {
        cwd: options.cwd ?? root,
        encoding: 'utf8',
        env: options.env ?? process.env,
        maxBuffer: 1024 * 1024 * 100,
    })

    if (result.status !== 0) {
        throw new Error(
            [
                `${command} ${commandArgs.join(' ')} failed with ${String(result.status)}`,
                result.stdout,
                result.stderr,
            ]
                .filter(Boolean)
                .join('\n'),
        )
    }

    return { stdout: result.stdout }
}

function runConsumerStep<Result>(
    completed: Array<string>,
    label: string,
    step: () => Result,
): Result {
    try {
        const result = step()
        completed.push(label)
        return result
    } catch (error) {
        throw new Error(
            `${completed.join(', ')} passed; ${label} failed: ${describe(error)}`,
            { cause: error },
        )
    }
}

async function startVerdaccio(rehearsalRoot: string): Promise<{
    stop: () => Promise<void>
    url: string
}> {
    const port = await getOpenPort()
    const url = `http://127.0.0.1:${port.toString()}/`
    const configPath = path.join(rehearsalRoot, 'verdaccio.yaml')
    writeFileSync(
        configPath,
        [
            `storage: ${path.join(rehearsalRoot, 'verdaccio-storage')}`,
            'uplinks: {}',
            'auth:',
            '  htpasswd:',
            `    file: ${path.join(rehearsalRoot, 'htpasswd')}`,
            '    max_users: 1',
            'packages:',
            "  '@snailicid3/*':",
            '    access: $all',
            '    publish: $all',
            '    unpublish: $all',
            '  "**":',
            '    access: $all',
            '    publish: $all',
            '    unpublish: $all',
            'logs:',
            '  - { type: stdout, format: pretty, level: warn }',
            '',
        ].join('\n'),
    )

    const child = spawn(
        'pnpm',
        ['exec', 'verdaccio', '--config', configPath, '--listen', url],
        {
            cwd: root,
            env: {
                ...process.env,
                npm_config_cache: path.join(rehearsalRoot, 'verdaccio-cache'),
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        },
    )
    let output = ''
    child.stdout.on('data', (chunk) => {
        output += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
        output += String(chunk)
    })

    await waitForRegistry(url, () => {
        if (child.exitCode !== null) {
            throw new Error(`Verdaccio exited early.\n${output}`)
        }
    })

    return {
        stop: () =>
            new Promise((resolve, reject) => {
                child.once('exit', () => {
                    resolve()
                })
                child.once('error', reject)
                child.kill('SIGTERM')
            }),
        url,
    }
}

function testBins(consumerRoot: string): ReadonlyArray<string> {
    const commands: ReadonlyArray<readonly [string, ...Array<string>]> = [
        ['gbt-workflow', '--help'],
        ['gbt-changeset', '--help'],
        ['scope-commit', '--validate-type', 'fix'],
        ['snail-sh', '--help'],
    ]
    const binRoot = path.join(consumerRoot, 'node_modules', '.bin')

    for (const [command, ...commandArgs] of commands) {
        const bin = path.join(binRoot, command)
        if (!existsSync(bin)) throw new Error(`Missing installed bin ${bin}`)
        run(bin, commandArgs, { cwd: consumerRoot })
    }

    return commands.map(([command]) => command)
}

function testConsumer(
    input: Readonly<{
        manager: 'npm' | 'pnpm'
        registryUrl: string
        root: string
    }>,
): Readonly<{
    bins: ReadonlyArray<string>
    manager: string
    result: 'passed'
}> {
    mkdirSync(input.root, { recursive: true })
    writeFileSync(
        path.join(input.root, 'package.json'),
        JSON.stringify(
            {
                name: `snailicid3-pr270-${input.manager}-consumer`,
                private: true,
                type: 'module',
            },
            undefined,
            2,
        ),
    )
    writeFileSync(path.join(input.root, '.npmrc'), npmrc(input.registryUrl))

    const installSpecs = candidatePackages.map(
        (pkg) => `${pkg.name}@${pkg.version}`,
    )
    const consumerPeerSpecs = ['vitest@^4.1.11']
    if (input.manager === 'npm') {
        run(
            'npm',
            [
                'install',
                '--ignore-scripts',
                ...installSpecs,
                ...consumerPeerSpecs,
            ],
            {
                cwd: input.root,
                env: {
                    ...process.env,
                    npm_config_cache: path.join(input.root, '.npm-cache'),
                },
            },
        )
    } else {
        run(
            'pnpm',
            [
                'add',
                '--ignore-scripts',
                '--store-dir',
                path.join(input.root, '.pnpm-store'),
                ...installSpecs,
                ...consumerPeerSpecs,
            ],
            { cwd: input.root },
        )
    }

    const completed: Array<string> = ['install']
    writeFileSync(
        path.join(input.root, 'runtime-contract.mjs'),
        createConsumerRuntimeTest(),
    )
    writeFileSync(
        path.join(input.root, 'types-contract.ts'),
        createConsumerTypeTest(),
    )
    writeFileSync(
        path.join(input.root, 'tsconfig.json'),
        JSON.stringify(
            {
                compilerOptions: {
                    module: 'NodeNext',
                    moduleResolution: 'NodeNext',
                    noEmit: true,
                    skipLibCheck: true,
                    strict: true,
                    target: 'ES2022',
                },
                files: ['types-contract.ts'],
            },
            undefined,
            2,
        ),
    )

    runConsumerStep(
        completed,
        'runtime exports and Workspace release-contract imports',
        () => run('node', ['runtime-contract.mjs'], { cwd: input.root }),
    )
    runConsumerStep(completed, 'declaration imports', () =>
        run(
            'pnpm',
            [
                'exec',
                'tsc',
                '--project',
                path.join(input.root, 'tsconfig.json'),
            ],
            {
                cwd: root,
            },
        ),
    )

    const bins = runConsumerStep(completed, 'public bins', () =>
        testBins(input.root),
    )
    return { bins, manager: input.manager, result: 'passed' }
}

async function validateDoctorAndArtifacts(
    packages: ReadonlyArray<PackedPackage>,
): Promise<
    Readonly<{
        artifactValidation: 'passed'
        doctor: 'passed'
        registeredFixtureFindings: number
    }>
> {
    for (const pkg of packages) {
        const candidate = createPackCandidate({ tarball: pkg.tarball })
        try {
            const result = await validatePackedCandidate(candidate)
            const errors = result.diagnostics.filter(
                (diagnostic) => diagnostic.severity === 'error',
            )
            if (errors.length > 0) {
                throw new Error(
                    `Packed artifact validation failed for ${pkg.name}:\n${errors
                        .map((error) => `${error.code}: ${error.message}`)
                        .join('\n')}`,
                )
            }
        } finally {
            candidate.dispose()
        }
    }

    const report = await runDoctorWithPackedValidation({
        packageNames: packages.map((pkg) => pkg.name),
        root,
    })
    if (report.summary.unregisteredFindings > 0) {
        throw new Error(
            `Doctor found unregistered findings:\n${report.diagnostics
                .filter((diagnostic) => diagnostic.fixtureId === undefined)
                .map(
                    (diagnostic) =>
                        `${diagnostic.packageName} ${diagnostic.code}: ${diagnostic.message}`,
                )
                .join('\n')}`,
        )
    }

    return {
        artifactValidation: 'passed',
        doctor: 'passed',
        registeredFixtureFindings: report.summary.knownFixtureFindings,
    }
}

async function waitForRegistry(
    registryUrl: string,
    checkProcess: () => void,
): Promise<void> {
    const deadline = Date.now() + 30_000
    while (Date.now() < deadline) {
        checkProcess()
        try {
            const response = await fetch(new URL('./-/ping', registryUrl))
            if (response.ok) return
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 250))
        }
    }
    throw new Error(`Verdaccio did not become ready at ${registryUrl}.`)
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack : error)
    process.exitCode = 1
})
