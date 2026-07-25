import { merge as deepMerge } from 'ts-deepmerge'
import {
    defineNxConfig,
    type NxPreset,
    type NxPresetFunctionOptions,
} from './api-functions.js'
import { getBaseConfig } from './base.config.js'
import {
    type ConfigTool,
    type ConfigToolApi,
    defineConfigBuilder,
    defineConfigTool,
    type IdentityDefineConfig,
} from '../core/index.js'

/** Deep-merge partial nx presets into one, mirroring how `base.config.ts` combines the fragments. */
const merge = (...presets: Array<Partial<NxPreset>>): NxPreset =>
    deepMerge(...presets)

/** Builds the merged Nx preset. `cwd` is accepted for signature uniformity with the other tools but unused today. */
const buildFunctionNx = defineConfigBuilder<NxPreset, NxPresetFunctionOptions>(
    () => getBaseConfig(),
)

export const Nx = defineConfigTool({
    config: buildFunctionNx,
    defineConfig: defineNxConfig,
    presets: {
        base: getBaseConfig,
        merge,
    },
} satisfies ConfigToolApi<
    NxPreset,
    NxPresetFunctionOptions,
    IdentityDefineConfig<NxPreset>,
    {
        presets: {
            base: typeof getBaseConfig
            merge: typeof merge
        }
    }
>)

export type NxTool = ConfigTool<
    NxPreset,
    NxPresetFunctionOptions,
    typeof Nx.defineConfig,
    Omit<typeof Nx, 'config' | 'defineConfig'>
>

export type {
    NxPreset,
    NxPresetFunctionOptions,
    NxTargets,
} from './api-functions.js'

export { defineNxConfig, defineNxTargets } from './api-functions.js'
export { prefixTargets, selectTargets } from './utilities.js'
