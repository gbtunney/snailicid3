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
            // (fix) was ^build; only upstream types needed
            dependsOn: ['^build:ts'],
            inputs: ['production', '^production'],
            options: { cwd: '{projectRoot}' },
            // (fix) tsc outDir is ./types; dist owned by bundler
            outputs: ['{projectRoot}/types'],
        },
        'build:tsdown': {
            cache: true,
            command: 'tsdown',
            // (fix) was ^build
            dependsOn: ['^build:ts'],
            inputs: ['production', '^production'],
            options: { cwd: '{projectRoot}' },
            outputs: ['{projectRoot}/dist'],
        },
        'build:vite': {
            cache: true,
            command: 'vite build',
            // (fix) ^build -> ^build:ts
            dependsOn: ['build:ts', '^build:ts'],
            inputs: ['production', '^production'],
            options: { cwd: '{projectRoot}' },
            outputs: ['{projectRoot}/dist'],
        },
    },
})
