import type z from 'zod'
import {
    coerceRegExpSchema,
    createEnumSchema,
    ensureArray,
    numeric,
} from './schemas.js'

/**
 * @deprecated This is replaced with ZodType<> in zod 4
 * @category Zod
 * @example
 *     schemaForType<{
 *         horse: string
 *         cat: number
 *     }>()(
 *         z.object({
 *             horse: z.string(),
 *             cat: z.number(),
 *         }),
 *     )
 */
export const schemaForType =
    <Type>() =>
    <Schema extends z.ZodType<Type>>(arg: Schema): Schema => {
        return arg
    }
/**
 * So that it doesnt lose its schema typing after a transform or merge function
 *
 * @category Zod
 */
export const wrapSchema = <Schema extends z.ZodType>(
    schema: Schema,
): Schema => {
    return schema
}
/**
 * Get zod data typed
 *
 * @category Zod
 * @example
 *     getZodData( z.object({
 *     prop1: z.string(),
 *     prop2: z.number().int(),
 *     },{
 *     prop1: 'i am a string',
 *     prop2: 2,
 *     prop3: 3
 *     } )
 *     => {
 *     prop1: 'i am a string',
 *     prop2: 2
 *     }
 */
export const parseZodData = <Schema extends z.ZodType>(
    value: unknown,
    schema: Schema,
): undefined | z.infer<Schema> => {
    return isZodParsable<Schema>(value, schema)
        ? schema.parse(value)
        : undefined
}
/**
 * Guard function to determine if value is parseable according to schema
 *
 * @category Zod
 * @example
 *     tg_Zod( z.object({
 *     prop1: z.string(),
 *     prop2: z.number().int(),
 *     },{
 *     prop1: 'i am a string',
 *     prop2: 2,
 *     } )
 *     => true
 */
export const isZodParsable = <Schema extends z.ZodType>(
    value: unknown,
    schema: Schema,
): value is z.infer<Schema> => {
    return schema.safeParse(value).success
}

export const parseFactory =
    <Schema extends z.ZodType>(schema: Schema) =>
    (data: unknown): undefined | z.infer<Schema> => {
        if (isZodParsable<Schema>(data, schema)) {
            return schema.parse(data)
        }
        return undefined
    }

/** @namespace This file contains utility functions for zod */
export const zodHelpers = {
    coerceRegExpSchema,
    createEnumSchema,
    ensureArray,
    isZodParsable,
    numeric,
    parseFactory,
    parseZodData,
    wrapSchema,
}
export default zodHelpers
export * from './json-stringified.js'

export type { ZodRegExp } from './schemas.js'
