import {
    defineEntry,
    defineIdentity,
    definePlan,
    identityFromPackage,
    toPackageExports,type PackageIdentity,
    toRollupConfig,
} from '@snailicid3/build-config'
import type { RollupOptions } from 'rollup'
import pkg from './package.json' with { type: 'json' }

const PRINT_EXPORTS = false


const ID :PackageIdentity= {
    runtime:"universal","product":"library","buildStrategy":"bundle"
}
const plan = definePlan(
    /* identityFromPackage(pkg)*/ ID  ?? defineIdentity('node', 'library', 'bundle'),
    './src',
    './dist',
    [defineEntry('.', ['esm', 'cjs', 'iife', 'umd'], { banner: true, sourcemap: true })],
)

if (PRINT_EXPORTS) console.log(toPackageExports(plan))

const config: RollupOptions[] = toRollupConfig(plan, 'gbtBoilerplate', pkg)

export default config
