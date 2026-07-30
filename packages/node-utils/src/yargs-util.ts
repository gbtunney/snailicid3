import yargs from 'yargs'
import { type z } from 'zod'

const parseArgsObject = (
    argv: ReadonlyArray<string>,
): Record<string, unknown> =>
    yargs([...argv])
        .exitProcess(false)
        .parserConfiguration({
            'parse-numbers': false,
            'parse-positional-numbers': false,
        })
        .parseSync()

/**
 * Parse command-line argument tokens and validate them with Zod.
 *
 * This is the lightweight alternative to `@snailicid3/cli-app`: it does not generate help, configure options, or start
 * an interactive prompt. Use Zod coercion (for example, `z.coerce.number()`) when converting string values.
 *
 * @throws {z.ZodError} When the parsed arguments do not satisfy the schema.
 * @group yargs
 */
export const parseArgv = <Schema extends z.ZodType>(
    schema: Schema,
    argv: ReadonlyArray<string>,
): z.output<Schema> => schema.parse(parseArgsObject(argv))

/**
 * Parse command-line argument tokens and safely validate them with Zod.
 *
 * Unlike {@link parseArgv}, validation failures are returned rather than thrown. The result preserves the schema's
 * transformed output type.
 *
 * @group yargs
 */
export const safeParseArgv = <Schema extends z.ZodType>(
    schema: Schema,
    argv: ReadonlyArray<string>,
): z.ZodSafeParseResult<z.output<Schema>> =>
    schema.safeParse(parseArgsObject(argv))

/** @group yargs */
export const getYArgs = <Type extends z.ZodObject>(
    schema: Type,
    debug = false,
    _yargs = process.argv,
): undefined | z.infer<Type> => {
    const data = yargs(_yargs).argv
    if (schema.safeParse(data).success) {
        return schema.parse(data)
    } else if (debug) return schema.parse(data)
    else return undefined
}

/** @group yargs */
export const getArgsObject = (
    value = process.argv,
): Promise<Record<string, unknown>> | Record<string, unknown> =>
    yargs(value).argv
