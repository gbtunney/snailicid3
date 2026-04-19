import {
    defineEntry,
    defineIdentity,
    definePlan,
    identityFromPackage,
    toRollupConfig,
} from '@snailicid3/build-config'
import type { RollupOptions } from 'rollup'
import pkg from './package.json' with { type: 'json' }

const plan = definePlan(
    identityFromPackage(pkg) ?? defineIdentity('node', 'cli', 'bundle'),
    './src',
    './dist',
    [defineEntry('.', ['esm'], { banner: true, sourcemap: true })],
)

const config: Array<RollupOptions> = toRollupConfig(plan, 'scaffold', pkg)
export default config
