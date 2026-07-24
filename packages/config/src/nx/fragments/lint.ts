import { defineNxConfig } from '../api-functions.js'

export default defineNxConfig({
    targetDefaults: {
        fix: {
            // (fix) never cache a mutating target
            cache: false,
            command:
                "pnpm exec prettier --write . '!**/*.api.md' --ignore-unknown && pnpm exec eslint . --fix",
            dependsOn: ['^build'],
            options: { cwd: '{projectRoot}' },
        },
        lint: {
            cache: true,
            command:
                "pnpm exec prettier --check . '!**/*.api.md' --ignore-unknown && eslint .",
            // (fix) dropped local `build`; upstream types for type-aware rules
            dependsOn: ['^build'],
            options: { cwd: '{projectRoot}' },
        },
    },
})
