import { z } from 'zod'
export type WrappedSchema<Schema extends ZodObjectSchema> =
    Schema extends ZodObjectSchema ? Schema : never
// Example: Refactor schema merging
export type ZodObjectSchema = z.ZodObject //| z.ZodType<z.ZodObject>  //| z.ZodEffects<z.AnyZodObject>
// Detect effects (transform/refine/preprocess)

/** TODO THIS HAS THE PRETTIFY HELPERS IN IT !!! */
export const wrapSchema = <Schema extends ZodObjectSchema>(
    schema: Schema,
): Schema => {
    return wrapAnyZodSchema<Schema>(schema)
}
export const wrapAnyZodSchema = <Schema extends z.ZodType>(
    schema: Schema,
): Schema => {
    return schema
}
export const getDefaultValue = <Schema extends z.ZodType>(
    schema: Schema,
): undefined | z.infer<Schema> => {
    const _parsed = schema.safeParse(undefined)
    if (_parsed.success) {
        return _parsed.data
    }
    return undefined
}

export const tgZodSchema = <Schema extends z.ZodType>(
    schema: Schema,
    value: unknown,
): value is Schema => schema.safeParse(value).success

export const isOptionalType = (schema: z.ZodType): boolean => {
    return schema.safeParse(undefined).success
}

type WithInnerType = { innerType: () => z.ZodType }
type WithRemoveDefault = { removeDefault: () => z.ZodType }
type WithUnwrap = { unwrap: () => z.ZodType }

const isObjectLike = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null

const hasUnwrap = (value: unknown): value is WithUnwrap =>
    isObjectLike(value) && typeof value['unwrap'] === 'function'

const hasInnerType = (value: unknown): value is WithInnerType =>
    isObjectLike(value) && typeof value['innerType'] === 'function'

const hasRemoveDefault = (value: unknown): value is WithRemoveDefault =>
    isObjectLike(value) && typeof value['removeDefault'] === 'function'

/** Container is a schema that contains other schemas, like array,object,record,set,map,tuple */
export const hasContainer = <Schema extends z.ZodType>(
    schema: Schema,
): boolean =>
    schema instanceof z.ZodArray ||
    schema instanceof z.ZodObject ||
    schema instanceof z.ZodRecord ||
    schema instanceof z.ZodSet ||
    schema instanceof z.ZodMap ||
    schema instanceof z.ZodTuple

/** Very simple recursive unwrapping: unwrap → removeDefault → innerType */
export const getValueSchema = <Schema extends z.ZodType>(
    schema: Schema,
    unwrapContainers: boolean = false,
): z.ZodType => {
    const current: z.ZodType = wrapAnyZodSchema<Schema>(schema)

    if (current instanceof z.ZodPipe) {
        // Yargs must parse the CLI-facing input type. Zod applies the pipe's
        // transforms after yargs has produced that value.
        return getValueSchema(
            current._zod.def.in as z.ZodType,
            unwrapContainers,
        )
    }

    if (!unwrapContainers && hasContainer(current)) {
        return current
    }

    // Logger.get().debug(`${current.type} hasUnwrap: ${hasUnwrap(current)} hasRemoveDefault:${hasRemoveDefault(current)} hasInnerType:${hasInnerType(current)}`)
    if (hasUnwrap(current)) {
        return getValueSchema(current.unwrap(), unwrapContainers)
    }
    if (hasRemoveDefault(current)) {
        return getValueSchema(current.removeDefault(), unwrapContainers)
    }
    if (hasInnerType(current)) {
        return getValueSchema(current.innerType(), unwrapContainers)
    }
    return current
}
