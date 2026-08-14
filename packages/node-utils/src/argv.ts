import yargs from 'yargs'
import { z } from 'zod'

export type Argv = ReadonlyArray<string>

export type ArgvObject = Record<string, unknown>

export type ParsedArgv<
    Schema extends ZodObjectLike,
    PositionalSchema extends undefined | ZodArrayLike = undefined,
> = PositionalSchema extends ZodArrayLike
    ? {
          readonly options: z.output<Schema>
          readonly positionals: z.output<PositionalSchema>
      }
    : z.output<Schema>

export type SafeParsedArgv<
    Schema extends ZodObjectLike,
    PositionalSchema extends undefined | ZodArrayLike = undefined,
> =
    | {
          readonly data: ParsedArgv<Schema, PositionalSchema>
          readonly success: true
      }
    | {
          readonly error: z.ZodError
          readonly success: false
      }

/** Schemas whose input is the positional argv array. */
export type ZodArrayLike = z.ZodArray | z.ZodTuple

/** Schemas whose input is an argv options object. */
export type ZodObjectLike = z.ZodDiscriminatedUnion | z.ZodObject | z.ZodRecord

/** Parse argv tokens into the normalized object produced by Yargs. */
export const parseArgvObject = (
    argv: Argv,
    booleanKeys: ReadonlyArray<string> = [],
): ArgvObject =>
    yargs([...argv])
        .exitProcess(false)
        .help(false)
        .version(false)
        // Flags must be declared boolean or yargs consumes the following token as their value, so
        // `--commit chore subject` would parse as `commit: 'chore'` with one positional instead of a
        // flag with two.
        .boolean([...booleanKeys])
        .parserConfiguration({
            'camel-case-expansion': true,
            'parse-numbers': false,
            'parse-positional-numbers': false,
            'strip-dashed': true,
        })
        .parseSync()

/** Collect the keys of a Zod object schema whose values are booleans, unwrapping optional/default. */
export const booleanSchemaKeys = (schema: ZodObjectLike): Array<string> => {
    const shape: unknown = (schema as { shape?: unknown }).shape

    if (typeof shape !== 'object' || shape === null) return []

    return Object.entries(shape as Record<string, unknown>)
        .filter(([, value]) => unwrapsToBoolean(value))
        .map(([key]) => key)
}

const unwrapsToBoolean = (schema: unknown, depth = 0): boolean => {
    if (depth > 8 || typeof schema !== 'object' || schema === null) return false

    const definition = (schema as { _zod?: { def?: unknown } })._zod?.def as
        undefined | { innerType?: unknown; type?: string }

    if (definition?.type === 'boolean') return true

    return definition?.innerType === undefined
        ? false
        : unwrapsToBoolean(definition.innerType, depth + 1)
}

/** Return the raw positional tokens from argv. */
export const parseArgvPositionals = (argv: Argv): Array<string> => {
    const positionals = parseArgvObject(argv)._

    return Array.isArray(positionals) ? positionals.map(String) : []
}

/**
 * Parse named options and, when supplied, positional arguments with separate Zod schemas. Throws a `ZodError` when
 * either schema rejects its input.
 */
export const parseArgv = <
    Schema extends ZodObjectLike,
    PositionalSchema extends undefined | ZodArrayLike = undefined,
>(
    schema: Schema,
    argv: Argv,
    positionalSchema?: PositionalSchema,
): ParsedArgv<Schema, PositionalSchema> => {
    const parsed = parseArgvObject(argv, booleanSchemaKeys(schema))
    const { $0: _command, _, ...namedOptions } = parsed
    const options = schema.parse(namedOptions)

    if (positionalSchema === undefined) {
        return options as ParsedArgv<Schema, PositionalSchema>
    }

    return {
        options,
        positionals: positionalSchema.parse(_),
    } as ParsedArgv<Schema, PositionalSchema>
}

/** Parse argv without throwing, returning a Zod-style success result. */
export const safeParseArgv = <
    Schema extends ZodObjectLike,
    PositionalSchema extends undefined | ZodArrayLike = undefined,
>(
    schema: Schema,
    argv: Argv,
    positionalSchema?: PositionalSchema,
): SafeParsedArgv<Schema, PositionalSchema> => {
    try {
        return {
            data: parseArgv(schema, argv, positionalSchema),
            success: true,
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error, success: false }
        }

        throw error
    }
}
