import { z } from 'zod'

/** Input value type for serialization (raw object value). This is BEFORE JSON.stringify. */
export type InferJsonSchemaInput<TStringifiedSchema> =
    TStringifiedSchema extends {
        inputValue(input: any): infer In
    }
        ? In
        : never

/** Output value type (after deserialization back to object). */
export type InferStringifiedOutput<TStringifiedSchema> =
    TStringifiedSchema extends {
        outputValue(output: any): infer Out
    }
        ? Out
        : never

/** The branded Json */
export type JsonStringified<Type> = string & { readonly __json_of: Type }

export type JsonStringifiedSchema<TSchema extends z.ZodType> =
    JsonStringifiedAPI<TSchema> &
        z.ZodType<JsonStringified<z.infer<TSchema>>, string>

type JsonStringifiedAPI<TSchema extends z.ZodType> = {
    deserialize(raw: JsonStringified<z.output<TSchema>>): z.output<TSchema>
    inputValue(input: z.input<TSchema>): z.input<TSchema>
    outputValue(output: z.output<TSchema>): z.output<TSchema>
    parseToValue(raw: string): z.output<TSchema>
    serialize(value: z.output<TSchema>): JsonStringified<z.output<TSchema>>
    validate(raw: string | z.input<TSchema>): boolean
}

export const makeJsonStringifiedSchema = <TSchema extends z.ZodType>(
    schema: TSchema,
): JsonStringifiedSchema<TSchema> => {
    type Output = z.infer<TSchema>
    type Input = z.input<TSchema>

    const base = z.string().superRefine((raw, ctx) => {
        let parsed: unknown

        try {
            parsed = JSON.parse(raw)
        } catch {
            ctx.addIssue({
                code: 'custom', // <-- Zod v4
                message: 'Value is not valid JSON',
            })
            return
        }
        const result = schema.safeParse(parsed)
        if (!result.success) {
            ctx.addIssue({
                code: 'custom', // <-- Zod v4
                message: 'Parsed JSON does not match schema',
                path: result.error.issues[0]?.path ?? [],
            })
        }
    })

    const brandedSchema: z.ZodType<
        JsonStringified<Output>,
        z.infer<typeof base>
    > = base.transform(
        (schema): JsonStringified<Output> => schema as JsonStringified<Output>,
    )
    const _api: JsonStringifiedAPI<TSchema> = {
        deserialize(raw: JsonStringified<Output>): Output {
            return schema.parse(JSON.parse(raw))
        },

        inputValue(input: Input): Input {
            return input
        },

        outputValue(output: Output): Output {
            return output
        },
        parseToValue(raw: string): Output {
            const branded = brandedSchema.parse(raw)
            return this.deserialize(branded)
        },
        serialize(value: Output): JsonStringified<Output> {
            return JSON.stringify(value) as JsonStringified<Output>
        },
        validate(raw: Input | string): boolean {
            try {
                if (typeof raw === 'string') {
                    this.parseToValue(raw)
                } else {
                    schema.parse(raw)
                }
                return true
            } catch {
                return false
            }
        },
    }
    const _result: JsonStringifiedAPI<TSchema> &
        z.ZodType<JsonStringified<z.infer<TSchema>>, string> = Object.assign(
        brandedSchema,
        _api,
    )
    return _result
}

export const jsonStringified = <TSchema extends z.ZodType>(
    schema: TSchema,
): JsonStringifiedSchema<TSchema> => makeJsonStringifiedSchema(schema)
