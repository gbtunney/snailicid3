import { logger, type Logger } from '@snailicid3/logger'
import { fmt, formatValue } from '@snailicid3/utils'
import type { ArrayValues } from 'type-fest'
import { type Choices, type Options as SingleYarg } from 'yargs'
import { type util, z } from 'zod'
import { type CLIAppMeta, updateMetaForSchema } from './metadata.js'
import {
    getDefaultValue,
    getValueSchema,
    isOptionalType,
    wrapAnyZodSchema,
    wrapSchema,
    type ZodObjectSchema,
} from './utils.js'
import { wrapString } from '../output/formatting.js'

type YargAppOption = Pick<SingleYarg, 'default' | 'describe' | 'type'>
type YargAppOptions = Record<string, SingleYarg> // Pick<Options, 'describe' | 'default' | 'type'>
type YargsEnumOptions = ArrayValues<Choices>
type YargsType = SingleYarg['type']

const LOGGER = (): Logger =>
    logger.get().child('schema-to-yargs', { level: 'error' })

/** Convert a zod schema to a yargs options object */
export const getYargAppOptionObject = <
    AppOptionsSchema extends ZodObjectSchema,
>(
    optionsSchema: AppOptionsSchema,
): YargAppOptions => {
    const option_schema: AppOptionsSchema =
        wrapSchema<AppOptionsSchema>(optionsSchema)

    const rawEntries = Array.from(
        Object.entries(option_schema.shape) as Array<[string, z.ZodType]>,
    )

    const result: YargAppOptions = {}

    for (const [_key, value] of rawEntries) {
        const wrapperSchema = wrapAnyZodSchema<z.ZodType>(value)

        const outerSchema = getValueSchema(wrapperSchema)
        const innerSchema = getValueSchema(outerSchema)

        const innerContainerSchema = getValueSchema(value, true)
        const optionMeta: CLIAppMeta | undefined = updateMetaForSchema(
            wrapperSchema,
            {
                id: _key,
            },
        )

        LOGGER().warn(
            fmt`\n\tKEY:[${_key}] WRAPPER:${wrapperSchema.type}\n\tOUTER: ${outerSchema.type} INNER:${innerSchema.type} CONTAINER:${innerContainerSchema.type} \n\tREQUIRED: [${!isOptionalType(wrapperSchema)}] DEFAULT: ${getDefaultValue(wrapperSchema)}`,
        )

        if (!optionMeta?.description) {
            LOGGER().warn(fmt`\nNO Description META FOR ${_key}`)
        }

        result[_key] = {
            alias: optionMeta?.alias,
            array: outerSchema.type === 'array',
            choices: getEnumValues(innerSchema),
            default: getDefaultValue(wrapperSchema),
            demandOption: !isOptionalType(wrapperSchema),
            description: fmt`${formatValue(optionMeta?.description)}${wrapString(getArraySchemaString(innerSchema))}`,
            hidden: optionMeta?.hidden,
            type: convertZodToYargsType(innerSchema),
        }
    }

    return result
}

/** Convert zod types to yargs types */
export const isZodYargsFriendly = (type: z.ZodType): boolean => {
    ///TODO: add a count type ? more exhaustive list?
    const _inner = type.type
    return (
        /* Positional Arguments for Yargs*/
        _inner === 'string' ||
        _inner === 'boolean' ||
        _inner === 'number' ||
        _inner === 'enum' ||
        /* Other types of arguments */
        _inner === 'array' ||
        _inner === 'object'
    )
}

export const convertZodToYargsType = (
    type: z.ZodType,
    defaultType: YargsType = 'boolean',
): YargsType => {
    ///TODO: add a count type ? more exhaustive list?
    const _inner = type.type

    if (!isZodYargsFriendly(type)) {
        logger.get().warn('YARGS unfriendly type encountered::: ', _inner)
    }

    const enumValues = getEnumValues(type)

    if (enumValues !== undefined) {
        /** GetEnumValues( type ) */
        const _enumValues: Array<util.EnumValue> = enumValues

        return getEnumType(_enumValues) as YargsType
    }
    //This returns the default type
    return isZodYargsFriendly(type) ? (_inner as YargsType) : defaultType
}

/** Get array schema for help table */
export const getArraySchemaString = (_schema: z.ZodType): string => {
    const innerSchema = getValueSchema(_schema, true)

    return _schema.type === 'array' ? `${innerSchema.type}[]` : ''
}

/** Get enum values for help table */
export const getEnumValues = <Schema extends z.ZodType>(
    schema: Schema,
): Array<util.EnumValue> | undefined => {
    if (schema instanceof z.ZodEnum) {
        const _options: ReadonlyArray<util.EnumValue> = schema.options
        const result: Array<util.EnumValue> = _options.map(
            (value: util.EnumValue): util.EnumValue => {
                return value
            },
        )
        return result
    }
    return undefined
}
export const getEnumType = (
    values: Array<util.EnumValue>,
): YargsEnumOptions => {
    return values.length > 0 ? typeof values[0] : 'string'
}
