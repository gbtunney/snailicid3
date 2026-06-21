import { describe, expect, test } from 'vitest'
import {
    definePrettierPluginRegistry,
    resolvePrettierPlugin,
    resolvePrettierPluginRegistry,
} from './registry.js'

describe('Prettier plugin registry', () => {
    test('resolves plugin object, package-name, and disabled plugin entries', () => {
        const plugin = resolvePrettierPlugin({
            languages: [],
            parsers: {},
            printers: {},
        })

        const registry = definePrettierPluginRegistry({
            '@prettier/plugin-php': plugin,
            '@prettier/plugin-xml': true,
            'prettier-plugin-jsdoc': true,
            'prettier-plugin-sh': false,
        })

        expect(resolvePrettierPluginRegistry(registry)).toEqual([
            plugin,
            '@prettier/plugin-xml',
            'prettier-plugin-jsdoc',
        ])
    })
})
