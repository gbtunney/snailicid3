import { zodHelpers } from '@snailicid3/utils'
import { z } from 'zod'

const metaSchema = z.object({
    alias: zodHelpers.ensureArray(z.string()).default([]),
    deprecated: z.boolean().default(false),
    description: z.string().optional(),
    hidden: z.boolean().default(false),
    id: z.string().optional(),
})

export type CLIAppMeta = MetaOutput
export type MetaSchema = typeof metaSchema

type MetaInput = z.input<typeof metaSchema>
type MetaOutput = z.output<typeof metaSchema>

/* eslint-disable @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type */
declare module 'zod' {
    interface GlobalMeta extends MetaInput {}
}

const parseMeta = <Schema extends MetaSchema = MetaSchema>(
    data: unknown,
    schema: Schema,
): undefined | z.output<Schema> => {
    const _parsed = schema.safeParse(data)
    return _parsed.success ? _parsed.data : undefined
}

export const getMetaForSchema = (schema: z.ZodType): CLIAppMeta | undefined => {
    const optionMeta = z.globalRegistry.get(schema)
    return parseMeta(optionMeta, metaSchema)
}

export const updateMetaForSchema = (
    schema: z.ZodType,
    data: Partial<MetaInput>,
): CLIAppMeta | undefined => {
    const optionMeta = getMetaForSchema(schema)
    const updatedMeta = parseMeta({ ...optionMeta, ...data }, metaSchema)
    if (updatedMeta !== undefined) {
        z.globalRegistry.add(schema, updatedMeta)
    }
    return updatedMeta
}
