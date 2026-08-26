import type { WorkspaceSnapshot } from '@snailicid3/workspace'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
    analyzeWorkspaceDependencyClosure,
    type EmbeddedWorkspaceCodeEvidence,
    type WorkspaceDependencyClosureAnalysis,
    type WorkspaceDependencyFact,
} from './dependency-closure.js'
import { analyzePackage } from './manifest.js'

export type AnalyzePackedTarballInput = Readonly<{
    embeddedWorkspaceCode?: ReadonlyArray<EmbeddedWorkspaceCodeEvidence>
    facts?: ReadonlyArray<WorkspaceDependencyFact>
    snapshot: WorkspaceSnapshot
    tarball: string
}>

export type IsolatedConsumerCheck = Readonly<{
    detail?: string
    name: string
    state: 'failed' | 'passed' | 'skipped'
}>

export type IsolatedPackageConsumerOptions = Readonly<{
    bins?: ReadonlyArray<string>
    imports?: ReadonlyArray<string>
    omitOptional?: boolean
    tarball: string
    typecheck?: Readonly<{
        compiler: string
        source: string
    }>
}>

export type IsolatedPackageConsumerResult = Readonly<{
    checks: ReadonlyArray<IsolatedConsumerCheck>
    optionalAbsenceProven: boolean
    state: 'failed' | 'passed'
}>

type CommandOutcome =
    | Readonly<{ detail: string; stdout: string; success: false }>
    | Readonly<{ stdout: string; success: true }>

/** Extract and analyze one npm tarball after rejecting paths that could escape the temporary root. */
export function analyzePackedTarballWorkspaceDependencyClosure(
    input: AnalyzePackedTarballInput,
): WorkspaceDependencyClosureAnalysis {
    const temporaryRoot = mkdtempSync(
        path.join(tmpdir(), 'snail-doctor-artifact-'),
    )

    try {
        const entries = run('tar', ['-tzf', path.resolve(input.tarball)])
        if (!entries.success) {
            throw new Error(`Unable to list packed artifact: ${entries.detail}`)
        }
        assertSafeTarEntries(entries.stdout.split('\n').filter(Boolean))
        const extracted = run('tar', [
            '-xzf',
            path.resolve(input.tarball),
            '-C',
            temporaryRoot,
        ])
        if (!extracted.success) {
            throw new Error(
                `Unable to extract packed artifact: ${extracted.detail}`,
            )
        }

        const artifactRoot = resolveNpmArtifactRoot(temporaryRoot)
        const artifactReport = analyzePackage(artifactRoot)
        return analyzeWorkspaceDependencyClosure({
            artifactRoot,
            artifactVerdict:
                artifactReport.diagnostics.length === 0 ? 'valid' : 'invalid',
            embeddedWorkspaceCode: input.embeddedWorkspaceCode,
            facts: input.facts,
            snapshot: input.snapshot,
        })
    } finally {
        rmSync(temporaryRoot, { force: true, recursive: true })
    }
}

/** Install the actual tarball into an empty project and exercise requested public runtime surfaces. */
export function runIsolatedPackageConsumer(
    options: IsolatedPackageConsumerOptions,
): IsolatedPackageConsumerResult {
    const consumerRoot = mkdtempSync(
        path.join(tmpdir(), 'snail-doctor-consumer-'),
    )
    const checks: Array<IsolatedConsumerCheck> = []

    try {
        const install = run(
            'npm',
            [
                'install',
                '--ignore-scripts',
                '--no-audit',
                '--no-fund',
                ...(options.omitOptional === true ? ['--omit=optional'] : []),
                path.resolve(options.tarball),
            ],
            consumerRoot,
        )
        checks.push(toCheck('install', install))

        if (install.success) {
            for (const specifier of [...(options.imports ?? [])].toSorted()) {
                checks.push(
                    toCheck(
                        `import:${specifier}`,
                        run(
                            process.execPath,
                            [
                                '--input-type=module',
                                '--eval',
                                `await import(${JSON.stringify(specifier)})`,
                            ],
                            consumerRoot,
                        ),
                    ),
                )
            }
            for (const bin of [...(options.bins ?? [])].toSorted()) {
                const binPath = path.join(
                    consumerRoot,
                    'node_modules',
                    '.bin',
                    bin,
                )
                checks.push(
                    existsSync(binPath)
                        ? toCheck(
                              `bin:${bin}`,
                              run(binPath, ['--help'], consumerRoot),
                          )
                        : {
                              detail: 'installed bin target is missing',
                              name: `bin:${bin}`,
                              state: 'failed',
                          },
                )
            }
            if (options.typecheck !== undefined) {
                writeFileSync(
                    path.join(consumerRoot, 'consumer.mts'),
                    options.typecheck.source,
                )
                writeFileSync(
                    path.join(consumerRoot, 'tsconfig.json'),
                    JSON.stringify({
                        compilerOptions: {
                            module: 'NodeNext',
                            moduleResolution: 'NodeNext',
                            noEmit: true,
                            strict: true,
                        },
                        files: ['consumer.mts'],
                    }),
                )
                checks.push(
                    toCheck(
                        'typecheck',
                        run(
                            path.resolve(options.typecheck.compiler),
                            ['--project', 'tsconfig.json'],
                            consumerRoot,
                        ),
                    ),
                )
            }
        } else {
            for (const specifier of options.imports ?? []) {
                checks.push({ name: `import:${specifier}`, state: 'skipped' })
            }
            for (const bin of options.bins ?? []) {
                checks.push({ name: `bin:${bin}`, state: 'skipped' })
            }
            if (options.typecheck !== undefined) {
                checks.push({ name: 'typecheck', state: 'skipped' })
            }
        }

        const state = checks.every(
            (check) => check.state === 'passed' || check.state === 'skipped',
        )
            ? 'passed'
            : 'failed'
        return {
            checks,
            optionalAbsenceProven:
                options.omitOptional === true && state === 'passed',
            state,
        }
    } finally {
        rmSync(consumerRoot, { force: true, recursive: true })
    }
}

function assertSafeTarEntries(entries: ReadonlyArray<string>): void {
    for (const entry of entries) {
        const normalized = path.posix.normalize(entry)
        if (
            path.posix.isAbsolute(entry) ||
            normalized === '..' ||
            normalized.startsWith('../')
        ) {
            throw new Error(`Packed artifact contains unsafe path: ${entry}`)
        }
    }
}

function resolveNpmArtifactRoot(extractedRoot: string): string {
    const npmRoot = path.join(extractedRoot, 'package')
    if (existsSync(path.join(npmRoot, 'package.json'))) return npmRoot
    if (existsSync(path.join(extractedRoot, 'package.json')))
        return extractedRoot
    throw new Error('Packed artifact does not contain package/package.json')
}

function run(
    command: string,
    args: ReadonlyArray<string>,
    cwd?: string,
): CommandOutcome {
    const result = spawnSync(command, [...args], {
        cwd,
        encoding: 'utf8',
        env: {
            ...process.env,
            npm_config_cache: path.join(cwd ?? tmpdir(), '.npm-cache'),
            npm_config_update_notifier: 'false',
        },
        timeout: 60_000,
    })
    const stdout = result.stdout
    if (result.status === 0) return { stdout, success: true }
    return {
        detail:
            result.error?.message ||
            result.stderr.trim() ||
            `command exited ${String(result.status)}`,
        stdout,
        success: false,
    }
}

function toCheck(name: string, outcome: CommandOutcome): IsolatedConsumerCheck {
    return outcome.success
        ? { name, state: 'passed' }
        : { detail: outcome.detail, name, state: 'failed' }
}
