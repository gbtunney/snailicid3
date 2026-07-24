import { defineNxConfig } from '../api-functions.js'

export default defineNxConfig({
    targetDefaults: {
        'dev': {
            cache: false,
            continuous: true,
            dependsOn: ['dev:ts'],
            options: { cwd: '{projectRoot}' },
        },
        'dev:rollup': {
            cache: false,
            command: 'rollup --watch --config ./rollup.config.mts',
            continuous: true,
            dependsOn: ['build:ts'],
            options: { cwd: '{projectRoot}' },
        },
        'dev:ts': {
            cache: false,
            command: 'tsc --build tsconfig.build.json --watch',
            continuous: true,
            options: { cwd: '{projectRoot}' },
        },
        'dev:tsdown': {
            cache: false,
            command: 'tsdown --watch',
            continuous: true,
            options: { cwd: '{projectRoot}' },
        },
        'dev:vite': {
            cache: false,
            command: 'pnpm exec vite --config ./vite.config.ts',
            continuous: true,
            dependsOn: ['build:ts'],
            options: { cwd: '{projectRoot}' },
        },
    },
})
