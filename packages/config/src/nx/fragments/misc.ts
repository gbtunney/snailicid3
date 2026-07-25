import { defineNxConfig } from '../api-functions.js'

export default defineNxConfig({
    targetDefaults: {
        'api:check': {
            cache: true,
            command: 'api-extractor run',
            dependsOn: ['build:ts', '^build'],
            inputs: ['production', '^production'],
            options: { cwd: '{projectRoot}' },
        },
        'api:report': {
            cache: true,
            command: 'api-extractor run --local',
            // Local build:ts for own types; upstream full build for their .d.cts
            dependsOn: ['build:ts', '^build'],
            inputs: ['production', '^production'],
            options: { cwd: '{projectRoot}' },
            outputs: ['{projectRoot}/etc/*.api.md'],
        },
        'build:storybook': {
            cache: true,
            command: 'pnpm exec storybook build',
            dependsOn: ['build'],
            // (fix) was src/**.tsx only
            inputs: ['production', '{projectRoot}/.storybook/**/*'],
            options: { cwd: '{projectRoot}' },
            outputs: ['{projectRoot}/storybook-static'],
        },
        'chromatic': {
            cache: false,
            command:
                'pnpm exec chromatic --project-token=$CHROMATIC_PROJECT_TOKEN --build-script-name build:storybook:nx',
            // (fix) dropped redundant build:ts
            dependsOn: ['check:ts', 'build:storybook'],
            options: { cwd: '{projectRoot}' },
        },
        'docs:build': {
            cache: true,
            command: 'pnpm exec typedoc',
            dependsOn: ['build:ts', 'docs:build:ts'],
            inputs: ['production', '^production'],
            options: { cwd: '{projectRoot}' },
            outputs: ['{projectRoot}/docs'],
        },
        'docs:build:ts': {
            cache: true,
            command: 'tsc --build tsconfig.docs.json',
            dependsOn: ['build:ts', '^build', '^docs:build:ts'],
            inputs: ['production', '^production'],
            options: { cwd: '{projectRoot}' },
        },
    },
})
