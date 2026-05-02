import {
    defineEntry,
    definePlan,
    identityFromPackage,
    toTsdownConfig,
} from '@snailicid3/build-config'
import { defineConfig } from 'tsdown'
import pkg from './package.json' with { type: 'json' }

const identity = identityFromPackage(pkg)

const plan = definePlan(identity, './src', './dist', [
    defineEntry('.', ['esm'], {
        banner: true,
        dts: true,
        sourcemap: true,
    }),
])

const config: ReturnType<typeof toTsdownConfig> = toTsdownConfig(plan)

export default defineConfig(config)
