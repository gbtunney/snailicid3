import type z from 'zod'
import { createBanner } from './banner.js'
import {
    normaliseExportKey,
    packageNameWithoutScope,
    resolveEntryFilename,
    resolveSourceEntryPath,
    slugLikeToDisplayName,
    slugLikeToPascalCase,
} from './helpers.js'
import { schemaBasePackage } from './schemas/index.js'
import {
    schemaBuildPlanEntrySpec,
    schemaBuildPlanRoot,
} from './schemas/plan.js'

export type BuildPlanRoot = z.output<typeof schemaBuildPlanRoot>
export type BuildPlanEntryInput = z.input<typeof schemaBuildPlanEntrySpec>
export type BuildPlanEntryBase = z.output<typeof schemaBuildPlanEntrySpec>
export type BuildPlanPackage = z.output<typeof schemaBasePackage>

export type ResolvedBuildPlanEntry = BuildPlanEntryBase & {
    bannerContent?: string
    displayName: string
    exportKey: string
    fileName: string
    moduleName: string
    sourcePath: string
}

export type ResolvedBuildPlan = {
    entries: Array<ResolvedBuildPlanEntry>
    outputDir: string
    packageName: string
    root: BuildPlanRoot
    sourceDir: string
}

export type DefineBuildPlanInput = {
    entries?: Array<BuildPlanEntryInput>
    root?: z.input<typeof schemaBuildPlanRoot>
}

export function defineBuildPlan<
    const Package extends z.input<typeof schemaBasePackage>,
>(pkg: Package, input: DefineBuildPlanInput = {}): ResolvedBuildPlan {
    const parsedPkg = schemaBasePackage.parse(pkg)
    const root = schemaBuildPlanRoot.parse(input.root ?? {})

    const entries =
        input.entries && input.entries.length > 0 ? input.entries : [{ key: '*' }]

    return {
        entries: entries.map((entry) =>
            deriveBuildPlanEntry({
                entry,
                pkg: parsedPkg,
                root,
            }),
        ),
        outputDir: root.outputDir,
        packageName: parsedPkg.name,
        root,
        sourceDir: root.sourceDir,
    }
}

export function deriveBuildPlanEntry(options: {
    entry: BuildPlanEntryInput
    pkg: BuildPlanPackage
    root: BuildPlanRoot
}): ResolvedBuildPlanEntry {
    const merged = {
        ...options.root,
        ...options.entry,
    }

    const parsedEntry = schemaBuildPlanEntrySpec.parse(merged)

    const keySlug = entryKeyToSlug(parsedEntry.key)
    const isRoot = isRootEntryKey(parsedEntry.key)

    const displayName = isRoot
        ? packageNameToDisplayName(options.pkg.name)
        : slugLikeToDisplayName(keySlug)

    const moduleName = isRoot
        ? packageNameToModuleName(options.pkg.name)
        : slugLikeToPascalCase(keySlug)

    const sourcePath = resolveSourceEntryPath({
        key: parsedEntry.key,
        sourceDir: parsedEntry.sourceDir,
        sourceFile: parsedEntry.sourceFile,
    })

    return {
        ...parsedEntry,
        bannerContent: parsedEntry.banner
            ? createBanner(moduleName, options.pkg)
            : undefined,
        displayName,
        exportKey: normaliseExportKey(parsedEntry.key),
        fileName: resolveEntryFilename(parsedEntry.key),
        moduleName,
        sourcePath,
    }
}

export function isRootEntryKey(key: string): boolean {
    return key === '*' || key === '.' || key === './' || key === 'index'
}

export function entryKeyToSlug(key: string): string {
    return isRootEntryKey(key) ? 'index' : key.replace(/^\.\//, '')
}

export function packageNameToDisplayName(packageName: string): string {
    return slugLikeToDisplayName(packageNameWithoutScope(packageName))
}

export function packageNameToModuleName(packageName: string): string {
    return slugLikeToPascalCase(packageNameWithoutScope(packageName))
}
