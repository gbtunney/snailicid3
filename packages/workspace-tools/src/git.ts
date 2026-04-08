import { getExecCommandOutput } from './exec.js'

export function isRepoClean(): boolean {
    const result = getExecCommandOutput('git status --porcelain')
    return result.success && result.result === ''
}

export function ensureRepoClean(): void {
    if (!isRepoClean()) {
        const result = getExecCommandOutput('git status --porcelain')
        console.error('Repo is dirty after running release verification steps.')
        console.error(result.result)
        console.error('\nFix locally, commit generated outputs, and push.')
        process.exit(1)
    }
}
