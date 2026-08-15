import { defineConfig } from 'tsdown'

/**
 * Minimal literal bootstrap config — deliberately not built with `@snailicid3/build-config`.
 *
 * build-config now consumes node-utils' `packageIdentitySchema`, and node-utils depends on this package. Building utils
 * _with_ build-config would close the loop, so the bootstrap tier (types → utils → node-utils) is literal and
 * everything above it uses the shared factories.
 *
 * The generated banner is the one thing given up here: it needs build-config's banner factory, and its content is a
 * build timestamp rather than anything a consumer depends on.
 *
 * Keep this file literal. Importing the shared factories here would restore the cycle.
 */
export default defineConfig([
    {
        clean: false,
        dts: true,
        entry: { index: './src/index.ts' },
        // Building must not rewrite this package's manifest.
        exports: false,
        format: ['esm', 'cjs'],
        logLevel: 'warn',
        outDir: './dist',
        platform: 'neutral',
        report: false,
    },
    {
        clean: false,
        // The browser global build inlines every dependency, so it needs its own tsdown call: the module
        // and global families cannot share one config.
        deps: { alwaysBundle: [/.*/u] },
        dts: false,
        entry: { index: './src/index.ts' },
        exports: false,
        format: ['iife'],
        globalName: 'Utils',
        logLevel: 'warn',
        outDir: './dist',
        platform: 'browser',
        report: false,
    },
])
