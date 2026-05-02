import {
    defineEntry,
    defineIdentity,
    definePlan,
    identityFromPackage,
    toTsdownConfig,
} from '@snailicid3/build-config'
import pkg from './package.json' with { type: 'json' }

const plan = definePlan(
    identityFromPackage(pkg) ?? defineIdentity('node', 'library', 'bundle'),
    './src',
    './dist',
    [
        defineEntry('.', ['esm', 'cjs', 'iife', 'umd'], {
            banner: true,
            dts: true,
            sourcemap: true,
        }),
    ],
)

export default toTsdownConfig(plan)
