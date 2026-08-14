/**
 * `@snailicid3/storybook-config`
 *
 * A thin wrapper over Storybook's default configuration with the framework and addons pre-wired, so consumer
 * `.storybook` entry files stay minimal — a `.storybook/main.ts` becomes just `export default defineStorybookMain()`.
 *
 * It is config only: the `build:storybook` / `chromatic` Nx targets already ship in `@snailicid3/config`'s nx preset,
 * so this package deliberately bundles no targets. Storybook itself (and the chosen framework) is a dependency of the
 * _consumer_ — this package just generates the config objects, defaulting to the React + Vite framework and overridable
 * per project.
 */
import { defineConfig } from '@snailicid3/config'

/** Default Storybook framework package name (override per project). */
export const DEFAULT_STORYBOOK_FRAMEWORK = '@storybook/react-vite'

/** Default addon package names. */
export const DEFAULT_STORYBOOK_ADDONS = [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
] as const

/** Default story glob patterns, relative to the `.storybook` directory. */
export const DEFAULT_STORY_GLOBS = [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
] as const

export type DefineStorybookMainInput = {
    /** Addon package names. Defaults to {@link DEFAULT_STORYBOOK_ADDONS}. */
    addons?: ReadonlyArray<string>
    /** Framework package name. Defaults to {@link DEFAULT_STORYBOOK_FRAMEWORK}. */
    framework?: string
    /** Options passed to the framework. */
    frameworkOptions?: StorybookFrameworkOptions
    /** Extra top-level fields merged onto the generated config (e.g. `viteFinal`, `docs`). */
    overrides?: Record<string, unknown>
    /** Story globs. Defaults to {@link DEFAULT_STORY_GLOBS}. */
    stories?: ReadonlyArray<string>
}

export type StorybookFrameworkOptions = Record<string, unknown>

/** Shape of a generated `.storybook/main` config. Extra Storybook fields are allowed via `overrides`. */
export type StorybookMainConfig = Record<string, unknown> & {
    addons: Array<string>
    framework: { name: string; options: StorybookFrameworkOptions }
    stories: Array<string>
}

/** Build a `.storybook/main` config with the framework + addons pre-wired. */
export const defineStorybookMain = (
    input: DefineStorybookMainInput = {},
): StorybookMainConfig => {
    const {
        addons = DEFAULT_STORYBOOK_ADDONS,
        framework = DEFAULT_STORYBOOK_FRAMEWORK,
        frameworkOptions = {},
        overrides = {},
        stories = DEFAULT_STORY_GLOBS,
    } = input

    return defineConfig({
        addons: [...addons],
        framework: { name: framework, options: frameworkOptions },
        stories: [...stories],
        ...overrides,
    })
}

export type DefineStorybookPreviewInput = {
    /** Extra top-level preview fields (e.g. `decorators`, `globalTypes`). */
    overrides?: Record<string, unknown>
    /** Preview parameters, merged onto the defaults. */
    parameters?: Record<string, unknown>
}

/** Shape of a generated `.storybook/preview` config. */
export type StorybookPreviewConfig = Record<string, unknown> & {
    parameters: Record<string, unknown>
}

const DEFAULT_PREVIEW_PARAMETERS: Record<string, unknown> = {
    controls: {
        matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
}

/** Build a `.storybook/preview` config with sensible default parameters. */
export const defineStorybookPreview = (
    input: DefineStorybookPreviewInput = {},
): StorybookPreviewConfig => {
    const { overrides = {}, parameters = {} } = input

    return defineConfig({
        parameters: { ...DEFAULT_PREVIEW_PARAMETERS, ...parameters },
        ...overrides,
    })
}

/** Build a `.storybook/manager` config. Currently a passthrough for project-specific manager settings. */
export const defineStorybookManager = (
    input: Record<string, unknown> = {},
): Record<string, unknown> => defineConfig({ ...input })

/** Grouped namespace mirroring the `@snailicid3/config` tool-API style. */
export const Storybook: {
    defaults: {
        addons: typeof DEFAULT_STORYBOOK_ADDONS
        framework: typeof DEFAULT_STORYBOOK_FRAMEWORK
        stories: typeof DEFAULT_STORY_GLOBS
    }
    main: typeof defineStorybookMain
    manager: typeof defineStorybookManager
    preview: typeof defineStorybookPreview
} = {
    defaults: {
        addons: DEFAULT_STORYBOOK_ADDONS,
        framework: DEFAULT_STORYBOOK_FRAMEWORK,
        stories: DEFAULT_STORY_GLOBS,
    },
    main: defineStorybookMain,
    manager: defineStorybookManager,
    preview: defineStorybookPreview,
}
