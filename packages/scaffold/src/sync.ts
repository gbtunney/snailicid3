import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { ScaffoldInput } from './input.js'
import { generatePackageJson } from './templates/package-json.js'
import { generateReadme, HEADER_END, HEADER_START } from './templates/readme.js'
import { generateTsConfig } from './templates/tsconfig.js'

export type SyncAction = 'created' | 'updated' | 'skipped' | 'needs-review'

export type SyncResult = {
    file: string
    action: SyncAction
    reason?: string
}

const syncPackageJson = (input: ScaffoldInput, packageDir: string): SyncResult => {
    const filePath = join(packageDir, 'package.json')
    const template = generatePackageJson(input)

    if (!existsSync(filePath)) {
        writeFileSync(filePath, JSON.stringify(template, null, 4) + '\n')
        return { action: 'created', file: 'package.json' }
    }

    const existing = JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>

    // Overwrite scripts entirely, merge devDependencies (add missing only)
    const existingDevDeps = (existing.devDependencies ?? {}) as Record<string, string>
    const templateDevDeps = (template.devDependencies ?? {}) as Record<string, string>
    const mergedDevDeps: Record<string, string> = { ...existingDevDeps }
    for (const [key, value] of Object.entries(templateDevDeps)) {
        if (!(key in mergedDevDeps)) {
            mergedDevDeps[key] = value
        }
    }

    const updated = {
        ...existing,
        devDependencies: mergedDevDeps,
        scripts: template.scripts,
    }

    writeFileSync(filePath, JSON.stringify(updated, null, 4) + '\n')
    return { action: 'updated', file: 'package.json', reason: 'scripts + devDependencies merged' }
}

const syncTsConfig = (input: ScaffoldInput, packageDir: string): SyncResult => {
    const filePath = join(packageDir, 'tsconfig.json')
    const template = generateTsConfig(input)

    if (!existsSync(filePath)) {
        writeFileSync(filePath, JSON.stringify(template, null, 4) + '\n')
        return { action: 'created', file: 'tsconfig.json' }
    }

    const existing = JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>
    const updated = {
        ...existing,
        compilerOptions: {
            ...(existing.compilerOptions as Record<string, unknown>),
            ...(template.compilerOptions as Record<string, unknown>),
        },
    }

    writeFileSync(filePath, JSON.stringify(updated, null, 4) + '\n')
    return { action: 'updated', file: 'tsconfig.json', reason: 'compilerOptions merged' }
}

const syncReadme = (input: ScaffoldInput, packageDir: string): SyncResult => {
    const filePath = join(packageDir, 'README.md')
    const header = generateReadme(input)

    if (!existsSync(filePath)) {
        writeFileSync(filePath, header)
        return { action: 'created', file: 'README.md' }
    }

    const existing = readFileSync(filePath, 'utf8')
    const startIdx = existing.indexOf(HEADER_START)
    const endIdx = existing.indexOf(HEADER_END)

    if (startIdx !== -1 && endIdx !== -1) {
        // Replace between markers
        const updated =
            existing.slice(0, startIdx) +
            header.trimEnd() +
            existing.slice(endIdx + HEADER_END.length)
        writeFileSync(filePath, updated)
        return { action: 'updated', file: 'README.md', reason: 'header block replaced' }
    }

    // Prepend header block
    writeFileSync(filePath, header + '\n' + existing)
    return { action: 'updated', file: 'README.md', reason: 'header block prepended' }
}

const checkRollupConfig = (packageDir: string): SyncResult => {
    const filePath = join(packageDir, 'rollup.config.mts')
    if (!existsSync(filePath)) {
        return {
            action: 'skipped',
            file: 'rollup.config.mts',
            reason: 'file not found — run scaffold to create',
        }
    }
    return {
        action: 'needs-review',
        file: 'rollup.config.mts',
        reason: 'never overwritten — review manually',
    }
}

export const syncPackage = (input: ScaffoldInput, packageDir: string): Array<SyncResult> => [
    syncPackageJson(input, packageDir),
    syncTsConfig(input, packageDir),
    syncReadme(input, packageDir),
    checkRollupConfig(packageDir),
]
