import { defineConfig } from 'tsdown'

/**
 * Minimal literal bootstrap config — deliberately not built with `@snailicid3/build-config`.
 *
 * build-config consumes node-utils' `packageIdentitySchema` as the canonical manifest identity shape. If node-utils
 * also built itself with build-config, a clean checkout could not build either package without the other already being
 * built. Breaking the cycle at this end is the cheaper direction: node-utils is one library entry with no multi-entry
 * or banner needs, so the literal config stays short, while build-config keeps a single source of truth for package
 * identity.
 *
 * Keep this file literal. Importing the shared factories here would restore the cycle.
 */
export default defineConfig({
    clean: false,
    dts: true,
    entry: { index: './src/index.ts' },
    // Building must not rewrite this package's manifest.
    exports: false,
    format: ['esm', 'cjs'],
    logLevel: 'warn',
    outDir: './dist',
    platform: 'node',
    report: false,
    target: ['es2020'],
})
