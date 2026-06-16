import { defineBuildPlan, toViteConfig } from '@snailicid3/build-config'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

const plan = defineBuildPlan(pkg, {
    entries: [{ key: '*', runtime: 'browser', sourceFile: 'main.tsx' }],
    root: { product: 'web_app', runtime: 'browser', sourceDir: './src' },
})

export default defineConfig(toViteConfig(plan))
