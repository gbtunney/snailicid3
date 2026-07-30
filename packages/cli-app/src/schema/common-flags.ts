import { fsPath } from '@snailicid3/node-utils'
import { z } from 'zod'

/**
 * Common flag schemas shared by CLI applications.
 *
 * `outDir` is normalized to an absolute path but is not required to exist, allowing the consuming application to create
 * it.
 *
 * @group CLI Schemas
 */
export const commonFlagsSchema = z.object({
    debug: z
        .boolean()
        .default(false)
        .meta({ alias: 'd', description: 'Debug output', hidden: true }),

    outDir: fsPath()
        .prefault('dir')
        .meta({
            alias: ['o', 'out'],
            description:
                'Output directory path; it may be created by the application',
        }),
})
export type CommonFlagsInput = z.input<typeof commonFlagsSchema>
export type CommonFlagsOutput = z.infer<typeof commonFlagsSchema>
export type CommonFlagsSchema = typeof commonFlagsSchema
