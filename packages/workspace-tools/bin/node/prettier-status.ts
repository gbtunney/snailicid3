#!/usr/bin/env tsx
import { getExecCommandOutput } from '../../src/exec.js'

const CYAN = '\x1b[36m'
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const GRAY = '\x1b[90m'
const RESET = '\x1b[0m'

function printSection(label: string) {
    console.log(`\n${CYAN}── ${label} ──${RESET}`)
}

function printKeyValue(key: string, value: string, color = GRAY) {
    console.log(`  ${GRAY}${key}:${RESET} ${color}${value}${RESET}`)
}

function runPrettierCheck() {
    printSection('Prettier')
    const result = getExecCommandOutput('pnpm prettier --check')

    if (result.success) {
        printKeyValue('status', 'clean', GREEN)
    } else {
        printKeyValue('status', 'needs formatting', RED)
        if (result.result) console.log(GRAY + result.result + RESET)
    }
}

runPrettierCheck()
