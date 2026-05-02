/**
 * Vitest Configuration
 *
 * @see [Vitest - A modern testing library for Vue 3](https://vitest.dev/)
 */
import { defineConfig, type ViteUserConfig } from 'vitest/config'

export type VitestConfig = ViteUserConfig

export const viTestConfig = (): VitestConfig =>
    defineConfig({
        test: {
            coverage: {
                provider: 'v8',
                reporter: ['text'],
            },
            exclude: ['node_modules', './dist/**/*', './**/*.test.js'],
        },
    })

/** @ignore */
export const vitest = {
    config: (): VitestConfig => viTestConfig(),
}

// Vitest v2+: avoid missing 'UserConfig' export by deriving the type
