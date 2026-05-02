import { z } from 'zod'

export const scaffoldInputSchema = z.object({
    description: z.string().default(''),
    name: z
        .string()
        .regex(/^[a-z][\da-z-]*$/, 'must be lowercase and hyphenated'),
})

export type ScaffoldInput = z.infer<typeof scaffoldInputSchema>
