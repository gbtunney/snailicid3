import { ensureArray as R_ensureArray } from 'ramda-adjunct'
import z from 'zod'

import { type Numeric } from '../number/index.js'
import { toNumeric } from '../number/transform.js'
import { escapeStringRegexpInvalid } from '../regexp/escape.js'

export type ZodRegExp = z.ZodType<RegExp>

/**
 * @category Zod
 * @category Schema
 */
export const coerceRegExpSchema = (
    doEscape = true,
): z.ZodType<RegExp, RegExp | string> => {
    return z
        .union([z.string(), z.instanceof(RegExp)])
        .transform((value, ctx) => {
            if (typeof value !== 'string') {
                return value
            }

            const escaped = escapeStringRegexpInvalid(value, doEscape)

            if (!escaped?.trim()) {
                ctx.addIssue({
                    code: 'custom',
                    message: 'Regular expression string cannot be empty.',
                })
                return z.NEVER
            }
            try {
                return new RegExp(escaped)
            } catch {
                ctx.addIssue({
                    code: 'custom',
                    message: 'Please provide a valid regular expression.',
                })
                return z.NEVER
            }
        })
}
/**
 * @category Zod
 * @category Schema
 */
export const ensureArray = <Type extends z.ZodType>(
    schema: Type,
): z.ZodType<Array<z.output<Type>>, Array<z.input<Type>> | z.input<Type>> => {
    const union = z
        .union([z.array(schema), schema])
        .transform<
            Array<z.output<Type>>
        >((value: Array<z.output<Type>> | z.output<Type>): Array<z.output<Type>> => {
            return R_ensureArray(value) ///Array.isArray(value) ? value : [value]
        })
    return union
}

/**
 * @category Zod
 * @category Schema
 */
export const numeric = (): z.ZodType<
    Numeric | undefined,
    bigint | number | string
> => {
    const result = z
        .union([z.string(), z.number(), z.bigint()])
        .transform((value: bigint | number | string): Numeric | undefined => {
            const _value: Numeric | undefined = toNumeric<typeof value>(value)
            return _value
        })
        .refine(
            (value) => value === undefined,
            'Please enter a valid number|bigint|string',
        )
    return result
}
export type EnumSchema<Type extends EnumValues> = z.ZodEnum<{
    [Key in Type[number]]: Key
}>

export type EnumValues = readonly [string, ...Array<string>]

export function createEnumSchema<const Type extends EnumValues>(
    values: Type,
): EnumSchema<Type> {
    return z.enum(values)
}
