import { packageNameSchema } from '@snailicid3/node-utils'
import type { WorkspaceSnapshot } from '@snailicid3/workspace'
import {
    existsSync,
    mkdtempSync,
    readdirSync,
    rmSync,
    writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
    analyzeWorkspaceDependencyClosure,
    type WorkspaceDependencyClosureAnalysis,
    type WorkspaceDependencyFact,
} from './dependency-closure.js'
import {
    createIsolatedPackageConsumerResult,
    type IsolatedConsumerCheck,
    type IsolatedPackageConsumerResult,
} from './isolated-consumer-evidence.js'
import { createPackCandidate, type PackCandidate } from './pack-candidate.js'
import { type CommandOutcome, runPackagingCommand } from './packed-tar.js'

export type AnalyzePackedCandidateInput = Readonly<{
    consumer?: Omit<
        IsolatedPackageConsumerOptions,
        'absentPackages' | 'omitOptional' | 'removedPackages' | 'tarball'
    >
    facts?: ReadonlyArray<WorkspaceDependencyFact>
    snapshot: WorkspaceSnapshot
}>

export type AnalyzePackedTarballInput = AnalyzePackedCandidateInput &
    Readonly<{ tarball: string }>

export type IsolatedPackageConsumerOptions = Readonly<{
    absentPackages?: ReadonlyArray<string>
    bins?: ReadonlyArray<string>
    imports?: ReadonlyArray<string>
    omitOptional?: boolean
    removedPackages?: ReadonlyArray<string>
    tarball: string
    typecheck?: Readonly<{
        compiler: string
        source: string
    }>
}>

/**
 * Analyze the dependency closure of a candidate the caller already prepared.
 *
 * Taking the candidate rather than a path is what keeps #228's promise that one prepared artifact is reused across
 * collectors: the archive was listed, checked and extracted once, so this analysis and the Publint/ATTW validation
 * cannot be looking at different bytes.
 */
export function analyzePackedCandidateWorkspaceDependencyClosure(
    candidate: PackCandidate,
    input: AnalyzePackedCandidateInput,
): WorkspaceDependencyClosureAnalysis {
    const initialAnalysis = analyzeWorkspaceDependencyClosure({
        artifactRoot: candidate.artifactRoot,
        facts: input.facts,
        snapshot: input.snapshot,
    })
    if (input.consumer === undefined) return initialAnalysis

    const absentPackages = [
        ...new Set(
            initialAnalysis.edges
                .filter((edge) => edge.kind === 'optionalDependencies')
                .map((edge) => edge.name),
        ),
    ].toSorted()
    const consumerEvidence = runIsolatedPackageConsumer({
        ...input.consumer,
        absentPackages,
        omitOptional: true,
        removedPackages: embeddedCandidates(initialAnalysis),
        tarball: candidate.tarball,
    })
    return analyzeWorkspaceDependencyClosure({
        artifactRoot: candidate.artifactRoot,
        consumerEvidence,
        facts: input.facts,
        snapshot: input.snapshot,
    })
}

/** Adopt one already-produced tarball as a candidate and analyze it. */
export function analyzePackedTarballWorkspaceDependencyClosure(
    input: AnalyzePackedTarballInput,
): WorkspaceDependencyClosureAnalysis {
    const candidate = createPackCandidate({ tarball: input.tarball })
    try {
        return analyzePackedCandidateWorkspaceDependencyClosure(
            candidate,
            input,
        )
    } finally {
        candidate.dispose()
    }
}

/** Install the actual tarball into an empty project and exercise requested public runtime surfaces. */
export function runIsolatedPackageConsumer(
    options: IsolatedPackageConsumerOptions,
): IsolatedPackageConsumerResult {
    const consumerRoot = mkdtempSync(
        path.join(tmpdir(), 'snail-doctor-consumer-'),
    )
    // The install cache lives outside the consumer project so it can never be mistaken for an installed module.
    const cacheRoot = mkdtempSync(path.join(tmpdir(), 'snail-doctor-cache-'))
    const run = (
        command: string,
        args: ReadonlyArray<string>,
    ): CommandOutcome =>
        runPackagingCommand(command, args, {
            cacheRoot,
            cwd: consumerRoot,
            timeout: 60_000,
        })
    const checks: Array<IsolatedConsumerCheck> = []
    const absentPackages = normalizePackageNames(options.absentPackages)
    const removedPackages = normalizePackageNames(
        options.removedPackages,
    ).filter((name) => !absentPackages.includes(name))

    try {
        const install = run('npm', [
            'install',
            '--ignore-scripts',
            '--no-audit',
            '--no-fund',
            ...(options.omitOptional === true ? ['--omit=optional'] : []),
            path.resolve(options.tarball),
        ])
        checks.push(toCheck('install', install))

        if (install.success) {
            for (const packageName of absentPackages) {
                checks.push(
                    findInstalledPackage(consumerRoot, packageName).length > 0
                        ? {
                              detail: 'optional package is installed',
                              name: `absence:${packageName}`,
                              state: 'failed',
                          }
                        : {
                              name: `absence:${packageName}`,
                              state: 'passed',
                          },
                )
            }
            for (const packageName of removedPackages) {
                // Behavioral proof needs the module genuinely gone, not merely declared bundled or unimported.
                for (const installed of findInstalledPackage(
                    consumerRoot,
                    packageName,
                )) {
                    rmSync(installed, { force: true, recursive: true })
                }
                checks.push(
                    findInstalledPackage(consumerRoot, packageName).length > 0
                        ? {
                              detail: 'package remained in the consumer tree',
                              name: `removed:${packageName}`,
                              state: 'failed',
                          }
                        : { name: `removed:${packageName}`, state: 'passed' },
                )
            }
            for (const specifier of [...(options.imports ?? [])].toSorted()) {
                checks.push(
                    toCheck(
                        `import:${specifier}`,
                        run(process.execPath, [
                            '--input-type=module',
                            '--eval',
                            `await import(${JSON.stringify(specifier)})`,
                        ]),
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
                        ? toCheck(`bin:${bin}`, run(binPath, ['--help']))
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
                        run(path.resolve(options.typecheck.compiler), [
                            '--project',
                            'tsconfig.json',
                        ]),
                    ),
                )
            }
        } else {
            for (const packageName of removedPackages) {
                checks.push({
                    name: `removed:${packageName}`,
                    state: 'skipped',
                })
            }
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
        // Installing and then omitting nothing proves nothing: absence only counts alongside an exercised surface.
        const exercised =
            state === 'passed' &&
            checks.some(
                (check) =>
                    check.state === 'passed' && !isAbsenceScaffold(check.name),
            )
        return createIsolatedPackageConsumerResult({
            absenceProven: exercised ? provenAbsences(checks) : [],
            absentPackages,
            checks,
            removedPackages,
            state,
        })
    } finally {
        rmSync(consumerRoot, { force: true, recursive: true })
        rmSync(cacheRoot, { force: true, recursive: true })
    }
}

/** Names whose code the artifact carries itself, so a consumer run can be asked to work without them installed. */
function embeddedCandidates(
    analysis: WorkspaceDependencyClosureAnalysis,
): ReadonlyArray<string> {
    const bundled = new Set(
        analysis.provenance
            .filter((entry) => entry.kind === 'bundled_module')
            .map((entry) => entry.name),
    )
    const declared = new Set(analysis.edges.map((edge) => edge.name))
    return [
        ...new Set(
            analysis.provenance
                .filter(
                    (entry) =>
                        entry.kind !== 'bundled_module' &&
                        !bundled.has(entry.name) &&
                        declared.has(entry.name),
                )
                .map((entry) => entry.name),
        ),
    ].toSorted()
}

/**
 * Every copy of a package in the consumer tree, not only the hoisted one.
 *
 * npm keeps a tarball's bundled dependencies nested under the installed package, where they stay resolvable from its
 * code. A top-level check alone would read that as absence and turn a still-resolvable module into proof.
 */
function findInstalledPackage(
    consumerRoot: string,
    packageName: string,
): ReadonlyArray<string> {
    const segments = packageName.split('/')
    const found: Array<string> = []
    const visit = (modulesRoot: string): void => {
        if (!existsSync(modulesRoot)) return
        const candidate = path.join(modulesRoot, ...segments)
        if (existsSync(path.join(candidate, 'package.json')))
            found.push(candidate)
        for (const entry of readdirSync(modulesRoot, { withFileTypes: true })) {
            if (!entry.isDirectory() || entry.name === '.bin') continue
            const entryRoot = path.join(modulesRoot, entry.name)
            if (entry.name.startsWith('@')) {
                for (const scoped of readdirSync(entryRoot, {
                    withFileTypes: true,
                })) {
                    if (scoped.isDirectory()) {
                        visit(path.join(entryRoot, scoped.name, 'node_modules'))
                    }
                }
                continue
            }
            visit(path.join(entryRoot, 'node_modules'))
        }
    }
    visit(path.join(consumerRoot, 'node_modules'))
    return found.toSorted()
}

function isAbsenceScaffold(name: string): boolean {
    return (
        name === 'install' ||
        name.startsWith('absence:') ||
        name.startsWith('removed:')
    )
}

function normalizePackageNames(
    names: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> {
    return [
        ...new Set((names ?? []).map((name) => packageNameSchema.parse(name))),
    ].toSorted()
}

function provenAbsences(
    checks: ReadonlyArray<IsolatedConsumerCheck>,
): ReadonlyArray<string> {
    return checks
        .filter(
            (check) =>
                check.state === 'passed' &&
                (check.name.startsWith('absence:') ||
                    check.name.startsWith('removed:')),
        )
        .map((check) => check.name.slice(check.name.indexOf(':') + 1))
        .toSorted()
}

function toCheck(name: string, outcome: CommandOutcome): IsolatedConsumerCheck {
    return outcome.success
        ? { name, state: 'passed' }
        : { detail: outcome.detail, name, state: 'failed' }
}
