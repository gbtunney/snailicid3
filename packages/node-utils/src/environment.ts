import { z } from 'zod'

export type EnvironmentDefinition<Shape extends EnvironmentShape> = {
    readonly keys: EnvironmentKeys<Shape>
    readonly parse: (
        environment: EnvironmentSource,
    ) => z.output<z.ZodObject<Shape>>
    readonly schema: z.ZodObject<Shape>
}

export type EnvironmentReportRow = {
    readonly source: 'default' | 'environment'
    readonly value: unknown
    readonly variable: string
}

export type EnvironmentSource = Readonly<Record<string, unknown>>

type EnvironmentKeys<Shape extends EnvironmentShape> = Readonly<{
    [Key in keyof Shape]: string
}>

type EnvironmentMetadata = {
    readonly environmentKey?: string
    readonly sensitive?: boolean
}

type EnvironmentShape = Readonly<Record<string, z.ZodType>>

const SENSITIVE_ENVIRONMENT_KEY_PATTERN =
    /(?:TOKEN|SECRET|PASSWORD|PASSWD|PRIVATE_KEY|API_KEY|ACCESS_KEY|CREDENTIAL)/iu

/** Read environment-specific metadata attached to a Zod schema. */
const getEnvironmentMetadata = (schema: z.ZodType): EnvironmentMetadata =>
    (schema.meta() ?? {}) as EnvironmentMetadata

/** Convert a camel-case property name to a conventional environment-variable name. */
const toEnvironmentKey = (key: string): string =>
    key
        .replaceAll(/([a-z\d])([A-Z])/gu, '$1_$2')
        .replaceAll(/[-\s]+/gu, '_')
        .toUpperCase()

/** Resolve an explicitly configured environment key or derive one from the property name. */
const getEnvironmentKey = (property: string, schema: z.ZodType): string => {
    const { environmentKey } = getEnvironmentMetadata(schema)

    return environmentKey ?? toEnvironmentKey(property)
}

/** Check whether an environment value should be hidden from reports. */
const isSensitiveEnvironmentValue = (
    variable: string,
    schema: z.ZodType,
): boolean =>
    getEnvironmentMetadata(schema).sensitive === true ||
    SENSITIVE_ENVIRONMENT_KEY_PATTERN.test(variable)

/** Define a typed environment mapping without coupling it to a global environment source. */
export const defineEnv = <const Shape extends EnvironmentShape>(
    shape: Shape,
): EnvironmentDefinition<Shape> => {
    const schema = z.object(shape)

    const keys = Object.fromEntries(
        Object.entries(shape).map(([property, propertySchema]) => [
            property,
            getEnvironmentKey(property, propertySchema),
        ]),
    ) as EnvironmentKeys<Shape>

    return {
        keys,
        parse(environment: EnvironmentSource): z.output<z.ZodObject<Shape>> {
            const values = Object.fromEntries(
                Object.entries(keys).map(([property, environmentKey]) => [
                    property,
                    environment[environmentKey],
                ]),
            )

            return schema.parse(values)
        },
        schema,
    }
}

/** Build safe report rows for the variables registered by an environment definition. */
export const getEnvironmentReportRows = <const Shape extends EnvironmentShape>(
    definition: EnvironmentDefinition<Shape>,
    environment: EnvironmentSource,
): Array<EnvironmentReportRow> => {
    const parsed = definition.parse(environment)
    const parsedValues = parsed as Record<string, unknown>

    return Object.entries(definition.keys).map(
        ([property, variable]): EnvironmentReportRow => {
            const propertySchema = definition.schema.shape[property]

            const source =
                environment[variable] === undefined ? 'default' : 'environment'

            const value = isSensitiveEnvironmentValue(variable, propertySchema)
                ? '[redacted]'
                : parsedValues[property]

            return {
                source,
                value,
                variable,
            }
        },
    )
}

/** Print a safe report of the variables registered by an environment definition. */
export const reportEnvironment = <const Shape extends EnvironmentShape>(
    definition: EnvironmentDefinition<Shape>,
    environment: EnvironmentSource = process.env,
): void => {
    const rows = getEnvironmentReportRows(definition, environment)

    console.table(
        rows.map(({ source, value, variable }) => ({
            Source: source,
            Value: value,
            Variable: variable,
        })),
    )
}
