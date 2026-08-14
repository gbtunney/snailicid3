import {
    type CommandResult,
    readPackageManifest,
    runCommand,
    type RunCommandOptions,
} from '@snailicid3/node-utils'
import path from 'node:path'
import { readWorkspaceEnvironment } from './environment.js'

export type PackageCommand = {
    args: Array<string>
    command: PackageManager
}

export type PackageManager = 'npm' | 'pnpm'

export type PackageManagerResolution = {
    packageManager: PackageManager
    source: 'default' | 'environment' | 'package.json'
}

/** Construct a shell-free command for a locally installed package binary. */
export function getPackageBinaryCommand(
    packageManager: PackageManager,
    binary: string,
    args: ReadonlyArray<string> = [],
): PackageCommand {
    return packageManager === 'npm'
        ? { args: ['exec', '--', binary, ...args], command: 'npm' }
        : { args: ['exec', binary, ...args], command: 'pnpm' }
}

/** Resolve npm or pnpm from an override, then package.json, then the legacy pnpm default. */
export function getPackageManager(
    repoRoot: string,
    environment: NodeJS.ProcessEnv = process.env,
): PackageManager {
    return resolvePackageManager(repoRoot, environment).packageManager
}

/** Construct a shell-free command for a package.json script. */
export function getPackageScriptCommand(
    packageManager: PackageManager,
    script: string,
    args: ReadonlyArray<string> = [],
): PackageCommand {
    const separator = args.length > 0 ? ['--'] : []

    return {
        args: ['run', script, ...separator, ...args],
        command: packageManager,
    }
}

/** Resolve both the active package manager and where its value came from. */
export function resolvePackageManager(
    repoRoot: string,
    environment: NodeJS.ProcessEnv = process.env,
): PackageManagerResolution {
    const configured =
        readWorkspaceEnvironment(environment).packageManagerOverride

    if (configured) {
        return { packageManager: configured, source: 'environment' }
    }

    const manifest = readPackageManifest(path.join(repoRoot, 'package.json'))

    // A malformed manifest must not look like an absent packageManager field: silently falling
    // through to the default hid real defects. Only 'missing' is a normal, quiet outcome.
    if (!manifest.success && manifest.reason === 'invalid') {
        throw new Error(
            `Unable to read ${path.join(repoRoot, 'package.json')}:\n${manifest.error}`,
        )
    }

    if (manifest.success && manifest.data.packageManager) {
        const name = manifest.data.packageManager.split('@', 1)[0]

        if (name === 'npm' || name === 'pnpm') {
            return { packageManager: name, source: 'package.json' }
        }

        throw new Error(`Unsupported package manager: ${name ?? ''}`)
    }

    return { packageManager: 'pnpm', source: 'default' }
}

export function runPackageBinary(
    repoRoot: string,
    binary: string,
    args: ReadonlyArray<string> = [],
    options: RunCommandOptions = {},
): CommandResult {
    const packageCommand = getPackageBinaryCommand(
        getPackageManager(repoRoot),
        binary,
        args,
    )

    return runCommand(packageCommand.command, packageCommand.args, {
        cwd: repoRoot,
        ...options,
    })
}

/** Run a package-manager-native command such as `root`, `list`, or `query`. */
export function runPackageManager(
    repoRoot: string,
    args: ReadonlyArray<string> = [],
    options: RunCommandOptions = {},
): CommandResult {
    return runCommand(getPackageManager(repoRoot), args, {
        cwd: repoRoot,
        ...options,
    })
}

export function runPackageScript(
    repoRoot: string,
    script: string,
    args: ReadonlyArray<string> = [],
    options: RunCommandOptions = {},
): CommandResult {
    const packageCommand = getPackageScriptCommand(
        getPackageManager(repoRoot),
        script,
        args,
    )

    return runCommand(packageCommand.command, packageCommand.args, {
        cwd: repoRoot,
        ...options,
    })
}
