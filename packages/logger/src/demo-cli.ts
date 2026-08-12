#!/usr/bin/env node

import { runCliIfEntrypointAsync } from '@snailicid3/node-utils'

import { runLevelLoggerDemo, runLoggerDemo, runSpinnerDemo } from './demo.js'

const runDemoCli = async (): Promise<void> => {
    const mode = process.argv[2] ?? 'terminal'

    if (mode === 'levels') {
        runLevelLoggerDemo()
        return
    }

    if (mode === 'spinner') {
        await runSpinnerDemo()
        return
    }

    await runLoggerDemo()

    if (mode === 'all') runLevelLoggerDemo()
}

void runCliIfEntrypointAsync(import.meta, runDemoCli)
