import { isValidColor, parseColorToHex } from '@snailicid3/color'
import { logger } from '@snailicid3/logger'
import { stringUtils } from '@snailicid3/utils'
import { z } from 'zod'
import { tgZodSchema, wrapSchema } from '../schema/utils.js'
export type AppConfig = AppConfigOut

export type AppConfigIn = z.input<typeof appConfigSchema>
export type AppConfigOut = z.infer<typeof appConfigSchema>
/**
 * This is the schema used to configure the Cli Application, these should NOT used in cli arguments when running the
 * client cli app
 */
export const appConfigSchema = z.object({
    description: z.string().optional(),
    /** Examples of usage */
    examples: z
        .array(z.tuple([z.string(), z.string()]))
        .default([])
        .meta({ description: 'Examples for app cli help' }),
    //Todo: allow figlet options?
    /** Use figlet to make large ascii title */
    figlet: z
        .boolean()
        .default(true)
        .meta({ description: 'Get title using lg ascii text w/FIGfont spec' }),
    /**
     * Shorthand Option Aliases (--help , -h )
     *
     * @example
     *     ;```sh
     *        pnpm test:example -h
     *      # are equivalent
     *     pnpm  test:example --help
     *     ```
     */
    log_level: z.enum(logger.LEVEL_NAMES).default('debug'),
    /** Hide an option from the help screen */
    /* hidden: z
        .array(z.string())
        .default([])
        .meta({ description: 'hide a key from the help menu' }),*/
    name: z
        .string()
        .transform((value: string): string =>
            stringUtils.hyphenate(value).toLowerCase(),
        ),
    print: z.boolean().default(true).meta({ description: 'Print the header' }),
    title_color: z

        .object({
            //TODO make into zod schema
            bg: z
                .string()
                .default('#12043A')
                .refine(
                    (value: string) => isValidColor(value),
                    'Must be a valid hex color string',
                )
                .transform((value: string) => parseColorToHex(value)),
            fg: z
                .string()
                .default('#d104ff')
                .refine(
                    (value: string) => isValidColor(value),
                    'Must be a valid hex color string',
                )
                .transform((value: string) => parseColorToHex(value)),
        })
        .default({
            bg: parseColorToHex('#12043A'),
            fg: parseColorToHex('#d104ff'),
        })
        .meta({
            description:
                /** TODO make all colorjs string colors parse to hex */
                'Color for the title text and background. Please use a valid hex color value.',
        }),
    version: z
        .string()
        .default('0.0.0')
        .refine((value) => stringUtils.isValidSemVer(value), {
            message: 'Version must be a valid semver',
        })
        .meta({ alias: ['v', 'version'] }),
})

export type AppConfigSchema = typeof appConfigSchema

export const resolveAppConfigSchema = (
    value: AppConfigIn,
    schema: AppConfigSchema, //Note : the default parameter errors like: schema:  AppConfigSchema=appConfigSchema
): undefined | z.infer<AppConfigSchema> => {
    if (tgZodSchema(schema, value)) {
        return schema.parse(value)
    } else {
        const result = schema.safeParse(value)
        if (!result.success) {
            logger.get().error(z.prettifyError(result.error))
        }
        return undefined
    }
}
const packageSchema = wrapSchema<typeof appConfigSchema>(appConfigSchema).pick({
    description: true,
    name: true,
    version: true,
})

export const parsePackageJson = (
    pkg: unknown,
): undefined | z.infer<typeof packageSchema> => {
    const _parseResult = packageSchema.safeParse(pkg)
    if (_parseResult.success) {
        return _parseResult.data
    }
    logger.get().error(z.prettifyError(_parseResult.error))

    return undefined
}
