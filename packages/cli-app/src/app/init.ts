import { logger } from '@snailicid3/logger'
import { type ArgvObject, safeValidateArgvRecord } from '@snailicid3/node-utils'
import { fmt } from '@snailicid3/utils'
import yargs from 'yargs'
import type { Argv, Options } from 'yargs'
import { type z } from 'zod'
import { type AppConfig, type AppConfigIn, appConfigSchema } from './config.js'
import { doPrintHeader, getHeader } from './header.js'
import { prettyErrorLog, removeAnsi } from '../output/formatting.js'
import { getYargAppOptionObject } from '../schema/to-yargs.js'
import { wrapSchema, type ZodObjectSchema } from '../schema/utils.js'

/**
 * A callback type that is invoked upon successful initialization of the application.
 *
 * @template AppOptionsSchema - The schema for app options, either a ZodObject or a ZodEffects schema.
 * @param {z.infer<AppOptionsSchema>} resolvedFlags - The resolved and validated flags based on the provided schema.
 * @param {string | undefined} help - The help string, if available, otherwise undefined.
 */
export type InitSuccessCallback<
    AppOptionsSchema extends ZodObjectSchema = z.ZodObject,
> = (
    args: z.infer<AppOptionsSchema>,
    config: AppConfig, // Or: z.infer<typeof appConfigSchema>
    help: string | undefined,
) => Promise<void> | void

/**
 * Initializes the application with the provided configuration and options schema.
 *
 * @template AppOptionsSchema - The schema for the application options.
 * @param {AppOptionsSchema} optionsSchema - The schema for validating the application options.
 * @param {AppConfigIn} config - The configuration object for the application.
 * @param {InitSuccessCallback<AppOptionsSchema>} initFunction - Callback invoked after successful argument validation.
 * @param {string[]} [_yargs] - The command-line arguments to be parsed. Default is `process.argv`
 * @returns {Promise<Argv | undefined>} - Returns a Yargs instance or undefined if initialization fails.
 */
export const initApp = async <AppOptionsSchema extends ZodObjectSchema>(
    optionsSchema: AppOptionsSchema,
    config: AppConfigIn,
    initFunction: InitSuccessCallback<AppOptionsSchema>,
    _yargs: Array<string> = process.argv,
): Promise<Argv | undefined> => {
    const _appConfigResult = appConfigSchema.safeParse(config)

    if (_appConfigResult.success) {
        const app_config: AppConfig = _appConfigResult.data
        /** .child({ module: 'initApp' }) */
        const LOGGER = logger.get().child('app_init')
        ///LOGGER.setLevel('debug')

        const option_schema: z.ZodObject =
            wrapSchema<z.ZodObject>(optionsSchema)

        const yargsAppOptionsConfig: Record<string, Options> =
            getYargAppOptionObject(option_schema)

        const wrapped_app_options = wrapSchema<AppOptionsSchema>(optionsSchema)

        /* * Populate description and header * */
        const desc: string = app_config.description
            ? app_config.description
            : wrapped_app_options.description
              ? wrapped_app_options.description
              : app_config.name
        const header: string = app_config.print
            ? doPrintHeader(getHeader(app_config))
            : fmt`\nWelcome to ${app_config.name} ${getHeader(app_config).divider}`

        /** Function to Write commander like options from zod descriptions */
        const getArgsInstance = (
            value = process.argv,
        ): Argv<Record<string, unknown>> => {
            const yargs_instance: Argv<Record<string, unknown>> = yargs(value)
            yargs_instance
                .scriptName(app_config.name)
                .version(app_config.version)
                .options(yargsAppOptionsConfig)
                .usage(desc)
                .usage(logger.getAnsiInstance('#727272', 'bg')('$ $0 [args]'))
                .example(app_config.examples)
            return yargs_instance
        }
        // Build configured yargs first
        const yargsInstance = getArgsInstance(_yargs)

        // Short-circuit for help/version so yargs handles printing and exit code

        const hasVersion = _yargs.includes('-v') || _yargs.includes('--version')
        const hasHelp = _yargs.includes('-h') || _yargs.includes('--help')

        // If (app_config.clear) clear()
        /* * Print the header if print ==true  * */
        console.log(header)
        if (hasVersion) {
            console.log(app_config.version)
            return yargsInstance
        }
        if (hasHelp) {
            yargsInstance.showHelp()
            return yargsInstance
        }
        // Yargs tokenizes once, here. The result is then handed to the shared node-utils validator rather
        // than being re-parsed: calling node-utils' `parseArgv` would build a second Yargs instance and
        // tokenize the same argv again, while validating the record directly here would fork the
        // positional/result contract that every other Snailicid3 CLI relies on.
        const raw_arguments = yargsInstance.parseSync() as ArgvObject

        const argSuccess = safeValidateArgvRecord(optionsSchema, raw_arguments)

        if (argSuccess.success) {
            const resolvedArgs: z.output<AppOptionsSchema> = argSuccess.data
            LOGGER.debug(fmt`SUCCESS! RESOLVED ARGUMENTS::${resolvedArgs}`)
            const _help: string = await yargsInstance.getHelp()
            await initFunction(resolvedArgs, app_config, removeAnsi(_help))

            return yargsInstance
        } else {
            const argParseError = argSuccess.error

            LOGGER.error(
                prettyErrorLog(
                    argParseError,
                    'Invalid command line arguments',
                    undefined,
                ),
            )
            return undefined
        }
    } else
        logger
            .get()
            .fatal(
                prettyErrorLog(
                    _appConfigResult.error,
                    'Invalid app configuration',
                    'magenta',
                ),
            )
    return undefined
}
export const initializeApp = initApp

export default initApp
