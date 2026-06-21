import { describe, expect, test } from 'vitest'
import {
    definePrettierPlugins,
    resolvePluginRegistry,
    resolvePrettierPlugin,
} from './plugin-registry.js'

describe('Prettier plugin registry', () => {
    test('resolves bundled, package-name, and disabled plugin entries', () => {
        const plugin = resolvePrettierPlugin({
            languages: [],
            parsers: {},
            printers: {},
        })

        const registry = definePrettierPlugins({
            '@prettier/plugin-php': plugin,
            '@prettier/plugin-xml': true,
            'prettier-plugin-jsdoc': true,
            'prettier-plugin-sh': false,
        })

        expect(resolvePluginRegistry(registry)).toEqual([
            plugin,
            '@prettier/plugin-xml',
            'prettier-plugin-jsdoc',
        ])
    })
})
