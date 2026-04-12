import { z } from 'zod'

export const scaffoldInputSchema = z.object({
    name: z.string().regex(/^[a-z][a-z0-9-]*$/, 'must be lowercase and hyphenated'),
    description: z.string().default(''),
})

export type ScaffoldInput = z.infer<typeof scaffoldInputSchema>
