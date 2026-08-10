#!/usr/bin/env node

import { runCliIfEntrypoint } from './entrypoint.js'
import {
    formatEnvironmentReport,
    resolveEnvironmentVariable,
} from './environment-report.js'
import {
    CONFIG_ENVIRONMENT_VARIABLES,
    type ConfigEnvironmentVariable,
} from './environment.js'
import {
    getPackageManager,
    runPackageBinary,
    runPackageScript,
} from './package-manager.js'
import { getRepoRoot } from '../workspace/git.js'

type PackageCommandName = 'environment' | 'exec' | 'manager' | 'run'

export function main(args: Array<string> = process.argv.slice(2)): void {
    const repoRoot = getRepoRoot({ fallbackToCwd: true })
    const [command, ...commandArgs] = args

    switch (command as PackageCommandName) {
        case 'environment':
            if (commandArgs.length === 0) {
                console.log(formatEnvironmentReport(repoRoot))
                return
            }

            if (commandArgs.length !== 1 || !commandArgs[0]) {
                throw new Error('environment accepts at most one variable name')
            }

            console.log(
                resolveEnvironmentVariable(
                    repoRoot,
                    parseEnvironmentVariable(commandArgs[0]),
                ),
            )
            return
        case 'exec':
            runForwardedCommand(
                commandArgs,
                (name, forwardedArgs) =>
                    runPackageBinary(repoRoot, name, forwardedArgs, {
                        stdio: 'inherit',
                    }).status,
            )
            return
        case 'manager':
            console.log(getPackageManager(repoRoot))
            return
        case 'run':
            runForwardedCommand(
                commandArgs,
                (name, forwardedArgs) =>
                    runPackageScript(repoRoot, name, forwardedArgs, {
                        stdio: 'inherit',
                    }).status,
            )
            return
        default:
            if (command === '--help' || command === '-h' || !command) {
                printHelp()
                return
            }

            throw new Error(`Unknown command: ${command}`)
    }
}

function parseEnvironmentVariable(value: string): ConfigEnvironmentVariable {
    const variables = Object.values(CONFIG_ENVIRONMENT_VARIABLES)

    if (variables.includes(value as ConfigEnvironmentVariable)) {
        return value as ConfigEnvironmentVariable
    }

    throw new Error(`Unknown environment variable: ${value}`)
}

function printHelp(): void {
    console.log(`Usage:
  snail-package manager
  snail-package environment [VARIABLE]
  snail-package exec <binary> [arguments...]
  snail-package run <script> [arguments...]`)
}

function runForwardedCommand(
    args: ReadonlyArray<string>,
    runner: (name: string, forwardedArgs: ReadonlyArray<string>) => number,
): void {
    const [name, ...forwardedArgs] = args

    if (!name) throw new Error('A binary or script name is required')

    const status = runner(name, forwardedArgs)

    if (status !== 0) {
        throw new Error(`${name} failed with exit code ${String(status)}`)
    }
}

export default main

runCliIfEntrypoint(import.meta, main, process.argv.slice(2))
