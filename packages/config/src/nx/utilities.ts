import type { TargetDependencyConfig } from 'nx/src/config/workspace-json-project-json.js'
import type { NxTargets } from './api-functions.js'

type Dependency = string | TargetDependencyConfig

/** Pick a subset of targets by key. Non-mutating; originals untouched. Missing keys are skipped. */
export const selectTargets = (
    targets: NxTargets,
    keys: Array<string>,
): NxTargets =>
    Object.fromEntries(
        keys.filter((key) => key in targets).map((key) => [key, targets[key]]),
    )

/**
 * Copy `targets` under a `${prefix}:` namespace, rewriting intra-set, same-project `dependsOn` references to their
 * prefixed names so the wiring stays internally consistent (e.g. `build` -> `build:ts` becomes `root:build` ->
 * `root:build:ts`).
 *
 * `^`-deps, `{ projects, target }` objects, and refs outside the set are left as-is. Returns a NEW object — the source
 * fragments are never mutated.
 */
export const prefixTargets = (
    prefix: string,
    targets: NxTargets,
): NxTargets => {
    const own = new Set(Object.keys(targets))
    const rename = (name: string): string => `${prefix}:${name}`
    const fixDep = (dep: Dependency): Dependency =>
        typeof dep === 'string' && own.has(dep) ? rename(dep) : dep
    return Object.fromEntries(
        Object.entries(targets).map(([name, config]) => [
            rename(name),
            config.dependsOn
                ? { ...config, dependsOn: config.dependsOn.map(fixDep) }
                : { ...config },
        ]),
    )
}
