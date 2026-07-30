import { describe, expect, it } from 'vitest'
import yargs from 'yargs'
import path from 'node:path'
import {
    exampleAppConfig,
    exampleOptionsSchema,
    getExampleOutputFile,
} from './example-options.js'
import { getYargAppOptionObject } from '../schema/to-yargs.js'

describe('CLI example', () => {
    const yargsOptions = getYargAppOptionObject(exampleOptionsSchema)

    it('maps filesystem schemas to string arguments', () => {
        expect(yargsOptions['outDir'].type).toBe('string')
        expect(yargsOptions['sourceDir'].type).toBe('string')
        expect(yargsOptions['file'].type).toBe('string')
        expect(yargsOptions['include'].type).toBe('string')
        expect(yargsOptions['settings'].type).toBe('string')
    })

    it('parses repeated flags as arrays', () => {
        const rawArguments = yargs([
            '-z',
            'gbt',
            '-z',
            'gbt2',
            '-t',
            '10',
            '-t',
            '20',
        ])
            .options(yargsOptions)
            .parseSync()
        const result = exampleOptionsSchema.parse(rawArguments)

        expect(result.tags).toEqual(['gbt', 'gbt2'])
        expect(result.thresholds).toEqual([10, 20])
    })

    it('parses a JSON string into a typed object', () => {
        const rawArguments = yargs([
            '--settings',
            '{"enabled":true,"labels":["one","two"]}',
        ])
            .options(yargsOptions)
            .parseSync()
        const result = exampleOptionsSchema.parse(rawArguments)

        expect(result.settings).toEqual({
            enabled: true,
            labels: ['one', 'two'],
        })
    })

    it('normalizes the default output directory', () => {
        const result = exampleOptionsSchema.parse({})

        expect(result.outDir).toBe(path.resolve('dir'))
        expect(result.sourceDir).toBe(path.resolve('.'))
        expect(getExampleOutputFile(result)).toBe(
            path.resolve('dir', 'output.json'),
        )
    })

    it('rejects a config file that does not exist', () => {
        const result = exampleOptionsSchema.safeParse({
            file: './missing-input-file.json',
        })

        expect(result.success).toBe(false)
    })

    it('prints coherent help with representative types and examples', async () => {
        const help = await yargs([])
            .scriptName(exampleAppConfig.name)
            .usage(exampleAppConfig.description ?? '')
            .options(yargsOptions)
            .example(exampleAppConfig.examples ?? [])
            .help()
            .getHelp()

        expect(help).toContain('Reference CLI demonstrating')
        expect(help).toContain('--sourceDir')
        expect(help).toContain('--outDir')
        expect(help).toContain('--tags')
        expect(help).toContain('[array]')
        expect(help).toContain('-z gbt -z gbt2')
        expect(help).toContain('--file')
        expect(help).toContain('./package.json')
        expect(help).toContain('--settings')
    })
})
