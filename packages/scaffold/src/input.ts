import { z } from 'zod'

export const scaffoldInputSchema = z.object({
    description: z.string().default(''),
    name: z
        .string()
        .regex(/^[a-z][a-z0-9-]*$/, 'must be lowercase and hyphenated'),
})

export type ScaffoldInput = z.infer<typeof scaffoldInputSchema>
