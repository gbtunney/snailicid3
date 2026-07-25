import { defineNxConfig } from '../api-functions.js'

export default defineNxConfig({
    namedInputs: {
        default: ['{projectRoot}/**/*', 'sharedGlobals'],
        production: [
            'default',
            '!{projectRoot}/**/*.test.*',
            '!{projectRoot}/**/*.spec.*',
            '!{projectRoot}/**/*.stories.*',
            // (fix) docs don't bust build/test cache
            '!{projectRoot}/**/*.md',
        ],
        sharedGlobals: [
            '{workspaceRoot}/tsconfig.json',
            '{workspaceRoot}/pnpm-lock.yaml',
            '{workspaceRoot}/eslint.config.ts',
            // (fix) affects lint/fix results
            '{workspaceRoot}/prettier.config.ts',
            '{workspaceRoot}/pnpm-workspace.yaml',
            '{workspaceRoot}/.markdownlint-cli2.mts',
        ],
    },
})
