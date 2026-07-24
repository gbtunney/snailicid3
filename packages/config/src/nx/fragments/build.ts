import { defineNxConfig } from '../api-functions.js'

export default defineNxConfig({
    targetDefaults: {
        // Bundler-AGNOSTIC aggregator; packages add their bundler via the nx key
        'build': {
            cache: true,
            dependsOn: ['build:ts'],
            inputs: ['production', '^production'],
        },
        'build:rollup': {
            cache: true,
            command: 'rollup --config ./rollup.config.mts',
            dependsOn: ['build:ts'],
            inputs: ['production', '^production'],
            options: { cwd: '{projectRoot}' },
            outputs: ['{projectRoot}/dist'],
        },
        'build:ts': {
            cache: true,
            command: 'tsc --build tsconfig.build.json',
            // Upstream `build` (not `build:ts`): bundled packages emit their .d.cts
            // from the bundler, so upstream types only exist after a full build.
            dependsOn: ['^build'],
            inputs: ['production', '^production'],
            options: { cwd: '{projectRoot}' },
            // (fix) tsc outDir is ./types; dist owned by bundler
            outputs: ['{projectRoot}/types'],
        },
        'build:tsdown': {
            cache: true,
            command: 'tsdown',
            dependsOn: ['^build'],
            inputs: ['production', '^production'],
            options: { cwd: '{projectRoot}' },
            outputs: ['{projectRoot}/dist'],
        },
        'build:vite': {
            cache: true,
            command: 'vite build',
            dependsOn: ['build:ts', '^build'],
            inputs: ['production', '^production'],
            options: { cwd: '{projectRoot}' },
            outputs: ['{projectRoot}/dist'],
        },
    },
})
