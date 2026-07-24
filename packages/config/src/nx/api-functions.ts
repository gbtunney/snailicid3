import type { NxJsonConfiguration } from 'nx/src/config/nx-json.js'
import type { TargetConfiguration } from 'nx/src/config/workspace-json-project-json.js'
import { type BaseConfigFunctionOptions, defineConfig } from '../core/index.js'

/**
 * The slice of an Nx workspace config this preset owns.
 *
 * Only `namedInputs` + `targetDefaults` are shared; per-repo keys (`nxCloudId`, `analytics`, `extends`) are supplied by
 * each consumer's own `nx.json`.
 */
export type NxPreset = {
    namedInputs?: NxJsonConfiguration['namedInputs']
    targetDefaults?: NxTargets
}

/** Options accepted by `Nx.config()`. `cwd` keeps the tool signature uniform with the other namespaces; it is unused. */
export type NxPresetFunctionOptions = BaseConfigFunctionOptions

/** A `targetDefaults` map keyed by target name. Each value is a plain (unfiltered) target configuration. */
export type NxTargets = Record<string, TargetConfiguration>

/** Identity define — typed passthrough for an nx fragment (a partial preset). */
export const defineNxConfig = <const TConfig extends NxPreset>(
    config: TConfig,
): TConfig => defineConfig(config)

/** Typed passthrough for a bare `targetDefaults` fragment. */
export const defineNxTargets = <const TTargets extends NxTargets>(
    targets: TTargets,
): TTargets => targets
