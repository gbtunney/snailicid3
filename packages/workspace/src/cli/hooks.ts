#!/usr/bin/env node

import { runCliIfEntrypoint } from '@snailicid3/node-utils'

import { getCurrentBranch, getRepoRoot } from './../core/git.js'
import {
    checkProtectedBranch,
    checkStagedFilenames,
    runCommitMessageHook,
    runLintStaged,
    runSnailSh,
    showHookSection,
    validateBranchName,
} from './../core/hooks.js'

type HookName = 'commit-msg' | 'pre-commit' | 'pre-push'

export function main(args: Array<string> = process.argv.slice(2)): void {
    const [hook, messageFile] = args
    const repoRoot = getRepoRoot({ fallbackToCwd: true })

    switch (hook as HookName) {
        case 'commit-msg':
            if (!messageFile)
                throw new Error('commit-msg requires a message file')
            showHookSection(repoRoot, 'Commit message hook')
            runHookPhase(repoRoot, 'Commit message', () => {
                runCommitMessageHook(repoRoot, messageFile)
            })
            return
        case 'pre-commit':
            showHookSection(repoRoot, 'Pre-commit hook')
            runHookPhase(repoRoot, 'Protected branch check', () => {
                checkProtectedBranch(repoRoot, 'commit')
            })
            runHookPhase(repoRoot, 'Branch name', () => {
                validateBranchName(repoRoot)
            })
            runHookPhase(repoRoot, 'Staged filenames', () => {
                checkStagedFilenames(repoRoot)
            })
            showHookSection(repoRoot, 'lint-staged')
            runHookPhase(repoRoot, 'lint-staged', () => {
                runLintStaged(repoRoot)
            })
            runSnailSh(repoRoot, 'spacer', ['1'])
            runSnailSh(repoRoot, 'status_pair', [
                'Protected branch check',
                'passed',
                'success',
            ])
            runSnailSh(repoRoot, 'status_pair', [
                'Branch name',
                getCurrentBranch(repoRoot),
                'success',
            ])
            runSnailSh(repoRoot, 'status_pair', [
                'Staged filenames',
                'passed',
                'success',
            ])
            runSnailSh(repoRoot, 'success', ['Pre-commit checks passed.'])
            return
        case 'pre-push':
            showHookSection(repoRoot, 'Pre-push hook')
            runHookPhase(repoRoot, 'Protected branch check', () => {
                checkProtectedBranch(repoRoot, 'push')
            })
            runSnailSh(repoRoot, 'spacer', ['1'])
            runSnailSh(repoRoot, 'status_pair', [
                'Protected branch check',
                'passed',
                'success',
            ])
            runSnailSh(repoRoot, 'status_pair', [
                'Branch name',
                getCurrentBranch(repoRoot),
                'success',
            ])
            runSnailSh(repoRoot, 'success', ['Pre-push checks passed.'])
            return
        default:
            throw new Error(
                'Usage: workspace-hook <pre-commit|commit-msg|pre-push> [arguments]',
            )
    }
}

function runHookPhase(
    repoRoot: string,
    label: string,
    phase: () => void,
): void {
    try {
        phase()
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        try {
            runSnailSh(repoRoot, 'spacer', ['1'])
            runSnailSh(repoRoot, 'critical', [`${label} failed: ${message}`])
            runSnailSh(repoRoot, 'status_pair', [label, 'failed', 'critical'])
            runSnailSh(repoRoot, 'spacer', ['1'])
        } catch {
            console.error(`${label} failed: ${message}`)
        }

        throw error
    }
}

runCliIfEntrypoint(import.meta, main, process.argv.slice(2))
