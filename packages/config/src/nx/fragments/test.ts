import { defineNxConfig } from '../api-functions.js'

export default defineNxConfig({
    targetDefaults: {
        'check:ts': {
            cache: true,
            command: 'tsc --build tsconfig.json',
            // (fix) was [build:ts, ^build]
            dependsOn: ['^build:ts'],
            // (fix) ^default -> ^production
            inputs: ['default', '^production'],
            options: { cwd: '{projectRoot}' },
        },
        'test': {
            cache: true,
            command: 'vitest run --coverage',
            // (fix) dropped local `build`
            dependsOn: ['^build', 'check:ts', '^test'],
            // (fix) ^default -> ^production
            inputs: ['default', '^production'],
            options: { cwd: '{projectRoot}' },
            // (fix) coverage now cached
            outputs: ['{projectRoot}/coverage'],
        },
        'test:watch': {
            cache: false,
            command: 'vitest watch',
            continuous: true,
            dependsOn: ['check:ts'],
            options: { cwd: '{projectRoot}' },
        },
    },
})
