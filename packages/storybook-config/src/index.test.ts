import { describe, expect, it } from 'vitest'
import {
    DEFAULT_STORYBOOK_ADDONS,
    DEFAULT_STORYBOOK_FRAMEWORK,
    defineStorybookMain,
    defineStorybookManager,
    defineStorybookPreview,
    Storybook,
} from './index.js'

describe('defineStorybookMain', () => {
    it('pre-wires the react-vite framework and default addons', () => {
        const main = defineStorybookMain()
        expect(main.framework.name).toBe(DEFAULT_STORYBOOK_FRAMEWORK)
        expect(main.addons).toEqual([...DEFAULT_STORYBOOK_ADDONS])
        expect(main.stories.length).toBeGreaterThan(0)
    })

    it('lets a project override the framework, addons, and stories', () => {
        const main = defineStorybookMain({
            addons: ['@storybook/addon-x'],
            framework: '@storybook/web-components-vite',
            stories: ['../stories/**/*.stories.ts'],
        })
        expect(main.framework.name).toBe('@storybook/web-components-vite')
        expect(main.addons).toEqual(['@storybook/addon-x'])
        expect(main.stories).toEqual(['../stories/**/*.stories.ts'])
    })

    it('merges extra top-level fields via overrides', () => {
        const main = defineStorybookMain({
            overrides: { docs: { autodocs: 'tag' } },
        })
        expect(main.docs).toEqual({ autodocs: 'tag' })
    })
})

describe('defineStorybookPreview', () => {
    it('provides default control matchers and merges parameters', () => {
        const preview = defineStorybookPreview({
            parameters: { layout: 'centered' },
        })
        expect(preview.parameters.layout).toBe('centered')
        expect(preview.parameters.controls).toBeDefined()
    })
})

describe('defineStorybookManager', () => {
    it('passes manager settings through', () => {
        expect(defineStorybookManager({ enableShortcuts: false })).toEqual({
            enableShortcuts: false,
        })
    })
})

describe('Storybook namespace', () => {
    it('groups the builders and defaults', () => {
        expect(Storybook.main).toBe(defineStorybookMain)
        expect(Storybook.preview).toBe(defineStorybookPreview)
        expect(Storybook.manager).toBe(defineStorybookManager)
        expect(Storybook.defaults.framework).toBe(DEFAULT_STORYBOOK_FRAMEWORK)
    })
})
