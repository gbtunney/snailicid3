import { merge } from 'ts-deepmerge'
import type { NxPreset } from './api-functions.js'
import build from './fragments/build.js'
import clean from './fragments/clean.js'
import dev from './fragments/dev.js'
import inputs from './fragments/inputs.js'
import lint from './fragments/lint.js'
import misc from './fragments/misc.js'
import root from './fragments/root.js'
import test from './fragments/test.js'

/**
 * Deep-merges every fragment into one `{ namedInputs, targetDefaults }` preset — the analogue of markdownlint's
 * `rules.base`. Each fragment owns a disjoint slice (no target key is defined twice), so the merge never has to
 * reconcile overlapping arrays.
 */
export const getBaseConfig = (): NxPreset =>
    merge(inputs, build, dev, clean, test, lint, misc, root)

export default getBaseConfig
