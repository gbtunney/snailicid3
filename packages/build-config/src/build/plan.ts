import type z from 'zod'
import path from 'node:path'
import { createBanner } from './banner.js'
import {
    entryKeyToSlug,
    isRootEntryKey,
    normaliseExportKey,
    packageNameToDisplayName,
    packageNameToModuleName,
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

export type BuildPlanEntryBase = z.output<typeof schemaBuildPlanEntrySpec>
export type BuildPlanEntryInput = Partial<
    z.input<typeof schemaBuildPlanEntrySpec>
>
export type BuildPlanPackage = z.output<typeof schemaBasePackage>
export type BuildPlanRoot = z.output<typeof schemaBuildPlanRoot>

export type DefineBuildPlanInput = {
    entries?: Array<BuildPlanEntryInput>
    root?: z.input<typeof schemaBuildPlanRoot>
}

export type PackageExportExtensionPreset = 'standard' | 'strict'

export type PackageExportExtensions = {
    cjs: string
    esm: string
    iife: string
    types: string
    umd: string
}

export type ResolvedBuildPlan = {
    entries: Array<ResolvedBuildPlanEntry>
    outputDir: string
    packageName: string
    root: BuildPlanRoot
    sourceDir: string
}

export type ResolvedBuildPlanEntry = BuildPlanEntryBase & {
    bannerContent?: string
    displayName: string
    exportKey: string
    fileName: string
    moduleName: string
    sourcePath: string
}

export type ToPackageExportsPlanOptions = {
    extensionPreset?: PackageExportExtensionPreset
    outDir?: string
    resolvePath?: (options: {
        condition: 'browser' | 'default' | 'import' | 'require' | 'types'
        entry: ResolvedBuildPlanEntry
        ext: string
        outDir: string
    }) => string
}

export function defineBuildPlan(
    pkg: unknown,
    input: DefineBuildPlanInput = {},
): ResolvedBuildPlan {
    const parsedPkg = schemaBasePackage.parse(pkg)
    const root = schemaBuildPlanRoot.parse(input.root ?? {})

    const entries =
        input.entries && input.entries.length > 0
            ? input.entries
            : [{ key: '*' }]

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
            ? createBanner(options.pkg, moduleName)
            : undefined,
        displayName,
        exportKey: normaliseExportKey(parsedEntry.key),
        fileName: resolveEntryFilename(parsedEntry.key),
        moduleName,
        sourcePath,
    }
}

export function toPackageExportsPlan(
    plan: ResolvedBuildPlan,
    options: ToPackageExportsPlanOptions = {},
): Record<string, Record<string, string>> {
    const extensionPreset = options.extensionPreset ?? 'standard'
    const extensionMap = getPackageExportExtensions(extensionPreset)
    const outDir = normaliseOutDirToPosix(options.outDir ?? plan.outputDir)
    const exportsMap: Record<string, Record<string, string>> = {}

    for (const entry of plan.entries) {
        if (!entry.exports) {
            continue
        }

        const conditions: Record<string, string> = {}
        const resolvePath = (
            condition: 'browser' | 'default' | 'import' | 'require' | 'types',
            ext: string,
        ): string => {
            if (options.resolvePath) {
                return options.resolvePath({ condition, entry, ext, outDir })
            }

            return `./${outDir}/${entry.fileName}${ext}`
        }

        if (entry.output_formats.includes('ts')) {
            conditions['types'] = resolvePath('types', extensionMap.types)
        }

        if (entry.output_formats.includes('esm')) {
            conditions['import'] = resolvePath('import', extensionMap.esm)
        }

        if (entry.output_formats.includes('cjs')) {
            conditions['require'] = resolvePath('require', extensionMap.cjs)
        }

        const browserExt = entry.output_formats.includes('iife')
            ? extensionMap.iife
            : entry.output_formats.includes('umd')
              ? extensionMap.umd
              : null

        if (browserExt !== null) {
            conditions['browser'] = resolvePath('browser', browserExt)
        }

        if (conditions['import']) {
            conditions['default'] = conditions['import']
        } else if (conditions['require']) {
            conditions['default'] = conditions['require']
        } else if (conditions['browser']) {
            conditions['default'] = conditions['browser']
        }

        exportsMap[entry.exportKey] = conditions
    }

    return exportsMap
}

function getPackageExportExtensions(
    preset: PackageExportExtensionPreset,
): PackageExportExtensions {
    if (preset === 'strict') {
        return {
            cjs: '.cjs',
            esm: '.mjs',
            iife: '-iife.js',
            types: '.d.mts',
            umd: '-umd.js',
        }
    }

    return {
        cjs: '.cjs',
        esm: '.js',
        iife: '-iife.js',
        types: '.d.ts',
        umd: '-umd.js',
    }
}

function normaliseOutDirToPosix(outDir: string): string {
    return path.posix.join(...path.relative('.', outDir).split(path.sep))
}

export {
    entryKeyToSlug,
    isRootEntryKey,
    packageNameToDisplayName,
    packageNameToModuleName,
} from './helpers.js'
