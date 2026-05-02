import {
    defineEntry,
    defineIdentity,
    definePlan,
    identityFromPackage,
    toTsdownConfig,
} from '@snailicid3/build-config'
import pkg from './package.json' with { type: 'json' }

const plan = definePlan(
    identityFromPackage(pkg) ?? defineIdentity('node', 'cli', 'bundle'),
    './src',
    './dist',
    [
        defineEntry('.', ['esm'], {
            banner: true,
            dts: true,
            sourcemap: true,
        }),
    ],
)

export default toTsdownConfig(plan)
