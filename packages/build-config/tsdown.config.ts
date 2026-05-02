import { defineConfig } from 'tsdown'

export default defineConfig({
    clean: true,
    dts: true,
    entry: { index: './src/index.ts' },
    format: ['esm', 'cjs'],
    outDir: './dist',
    platform: 'node',
    sourcemap: true,
})
