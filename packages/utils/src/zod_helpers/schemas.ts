/**
 * Zod schema helpers — implemented locally to avoid circular dependency
 * (utils → zod-helpers → utils).
 */
import { isRegExp, isString } from 'ramda-adjunct'
import z from 'zod'
import { Numeric } from '../number/numeric.js'
import { toNumeric } from '../number/transform.js'
import { escapeStringRegexpInvalid } from '../regexp/escape.js'

export type ZodRegExp = z.ZodType<RegExp>

export const resolveRegExpSchema = (
    doEscape: boolean = true,
): z.ZodType<RegExp, string | RegExp> =>
    z.union([z.string(), z.instanceof(RegExp)])
        .transform<RegExp>((value) => {
            if (isString(value)) {
                const _value = escapeStringRegexpInvalid(value, doEscape)
                return new RegExp(_value ?? '')
            }
            return value
        })
        .refine(
            (value: RegExp) => value.source !== '(?:)' && isRegExp(value),
            'Please provide a valid regular expression.',
        )

export const ensureArray = <Type extends z.ZodType>(
    schema: Type,
): z.ZodType<Array<z.output<Type>>, z.input<Type> | Array<z.input<Type>>> =>
    z.union([z.array(schema), schema]).transform<Array<z.output<Type>>>(
        (value) => (Array.isArray(value) ? value : [value]),
    )

export const numeric = (): z.ZodType<Numeric | undefined, string | number | bigint> =>
    z.union([z.string(), z.number(), z.bigint()])
        .transform((value): Numeric | undefined => toNumeric(value))
        .refine((value) => value !== undefined, 'Please enter a valid number|bigint|string')
