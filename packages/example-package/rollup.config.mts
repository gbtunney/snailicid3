import {
    defineEntry,
    defineIdentity,
    definePlan,
    identityFromPackage,
    toPackageExports,
    toRollupConfig,
} from '@snailicid3/build-config'
import type { RollupOptions } from 'rollup'
import pkg from './package.json' with { type: 'json' }

const PRINT_EXPORTS = false

const plan = definePlan(
    identityFromPackage(pkg) ?? defineIdentity('node', 'library', 'bundle'),
    './src',
    './dist',
    [defineEntry('.', ['esm', 'cjs'], { banner: true, sourcemap: true })],
)

if (PRINT_EXPORTS) console.log(toPackageExports(plan))

const config: RollupOptions[] = toRollupConfig(plan, 'gbtBoilerplate', pkg)
export default config
