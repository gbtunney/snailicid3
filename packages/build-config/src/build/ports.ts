import { isRootEntryKey, normaliseExportKey } from './helpers.js'
import type { ResolvedBuildPlan, ResolvedBuildPlanEntry } from './plan.js'

export type BuildAdapter = {
    /** Execute the build described by `plan`. */
    build(plan: ResolvedBuildPlan): Promise<void>

    /**
     * Optionally return the tool-specific configuration object without executing a build. Useful for inspecting or
     * exporting config.
     */
    createConfig?(plan: ResolvedBuildPlan): unknown

    /** Human-readable adapter name (e.g. `"tsdown"`, `"tsc"`). */
    name: string
}

export function findPlanEntries(
    plan: ResolvedBuildPlan,
    entryKey: string,
): Array<ResolvedBuildPlanEntry> {
    const normalizedEntryKey = normalizePlanEntryKey(entryKey)

    return plan.entries.filter((entry) =>
        [
            entry.key,
            entry.exportKey,
            entry.fileName,
            `./${entry.fileName}`,
        ].some(
            (candidate) =>
                normalizePlanEntryKey(candidate) === normalizedEntryKey,
        ),
    )
}

export function getPlanEntry(
    plan: ResolvedBuildPlan,
    entryKey: string,
): ResolvedBuildPlanEntry | undefined {
    return findPlanEntries(plan, entryKey)[0]
}

export function hasPlanEntry(
    plan: ResolvedBuildPlan,
    entryKey: string,
): boolean {
    return findPlanEntries(plan, entryKey).length > 0
}

export function normalizePlanEntryKey(entryKey: string): string {
    if (isRootEntryKey(entryKey) || entryKey === './index') {
        return '.'
    }

    return normaliseExportKey(entryKey)
}
