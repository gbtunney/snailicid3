import { fsTypedPath } from '@snailicid3/node-utils'
import { jsonStringified } from '@snailicid3/utils'
import { z } from 'zod'
import path from 'node:path'
import type { AppConfigIn, InitSuccessCallback } from '../index.js'
import { commonFlagsSchema } from '../index.js'

const settingsJsonSchema = jsonStringified(
    z.object({
        enabled: z.boolean(),
        labels: z.array(z.string()),
    }),
)

/**
 * Runnable reference schema covering each CLI-friendly primitive, repeatable arrays, and normalized or typed filesystem
 * paths.
 *
 * Field-level `.meta()` values become aliases and descriptions in `--help`.
 */
export const exampleOptionsSchema = commonFlagsSchema.extend({
    count: z
        .number()
        .default(1)
        .meta({ alias: 'n', description: 'Number of operations to perform' }),
    dryRun: z
        .boolean()
        .default(false)
        .meta({ description: 'Show what would happen without making changes' }),
    file: fsTypedPath('file', { exists: true })
        .optional()
        .meta({ alias: 'i', description: 'Existing input file' }),
    filename: z
        .string()
        .default('output.json')
        .meta({ description: 'Output filename within --out-dir' }),
    format: z
        .enum(['json', 'text', 'yaml'])
        .default('text')
        .meta({ alias: 'f', description: 'Output format' }),
    include: fsTypedPath(['file', 'directory', 'glob'] as const)
        .optional()
        .meta({
            description: 'Existing file/directory or glob pattern to include',
        }),
    settings: settingsJsonSchema
        .transform((raw) => settingsJsonSchema.deserialize(raw))
        .optional()
        .meta({
            description: 'JSON object containing enabled and labels fields',
        }),
    sourceDir: fsTypedPath('directory')
        .prefault('.')
        .meta({ alias: 's', description: 'Existing source directory' }),
    tags: z.array(z.string()).default([]).meta({
        alias: 'z',
        description: 'Tag to attach; repeat the flag for multiple values',
    }),
    thresholds: z.array(z.number()).default([]).meta({
        alias: 't',
        description: 'Numeric threshold; repeat the flag for multiple values',
    }),
})

export type ExampleOptions = z.output<typeof exampleOptionsSchema>

/** Command-level description and examples rendered in `--help`. */
export const exampleAppConfig: AppConfigIn = {
    description:
        'Reference CLI demonstrating Zod-backed strings, numbers, booleans, enums, arrays, and filesystem paths.',
    examples: [
        [
            '$0 --source-dir . --out-dir dir',
            'Read the current directory and write to ./dir',
        ],
        [
            '$0 -z gbt -z gbt2 --format json',
            'Supply an array by repeating a flag',
        ],
        [
            '$0 --include "src/**/*.ts" --dry-run',
            'Use a glob and boolean flag without writing changes',
        ],
        [
            '$0 --file ./package.json --filename result.json -t 10 -t 20',
            'Use an existing file and repeated numeric values',
        ],
        [
            `$0 --settings '{"enabled":true,"labels":["one","two"]}'`,
            'Parse a JSON string into a typed object',
        ],
    ],
    name: 'cli-app-example',
    print: false,
    version: '0.0.0',
}

/** Print the fully validated and transformed example arguments. */
export const printExampleResult: InitSuccessCallback<
    typeof exampleOptionsSchema
> = (args): void => {
    console.log(
        JSON.stringify(
            {
                ...args,
                outputFile: getExampleOutputFile(args),
            },
            undefined,
            2,
        ),
    )
}

/**
 * Combine the normalized output directory and filename after schema parsing.
 *
 * Keeping this cross-field operation outside Zod allows the root CLI schema to remain a Zod object that can be mapped
 * directly to yargs options.
 */
export const getExampleOutputFile = (
    args: Pick<ExampleOptions, 'filename' | 'outDir'>,
): string => path.resolve(args.outDir, args.filename)
