import { realpathSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

/**
 * RunIfEntrypoint helper is the TypeScript/ESM equivalent of this shell script pattern:
 *
 * ```sh
 * if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
 * main "$@"
 * fi
 * ```
 */

export type EntrypointOptions = {
    log?: boolean
}

export type ImportMetaWithUrl = Pick<ImportMeta, 'url'>

type AsyncFunction<Args extends ReadonlyArray<unknown>, Result> = (
    ...args: Args
) => Promise<Result>

type SyncFunction<Args extends ReadonlyArray<unknown>, Result> = (
    ...args: Args
) => Result

/** Check whether a caller module is the executable path in process.argv. */
export function isCallerEntrypoint(
    callerMeta: ImportMetaWithUrl,
    options: EntrypointOptions = {},
): boolean {
    const { log: logEnabled = false } = options
    const log = (...args: Array<unknown>): undefined => {
        if (!logEnabled) return undefined
        console.log('[runIfEntrypoint]', ...args)
        return undefined
    }

    const entryPath: string | undefined = process.argv.at(1)
    const entryUrl =
        entryPath === undefined ? undefined : toRealFileUrl(entryPath)
    const callerUrl = toRealFileUrl(fileURLToPath(callerMeta.url))
    const isEntrypoint = entryUrl !== undefined && callerUrl === entryUrl

    log('argv =', process.argv)
    log('argv[0] =', process.argv[0])
    log('argv[1] =', entryPath)
    log('entryUrl =', entryUrl)
    log('callerMeta.url =', callerMeta.url)
    log('callerUrl =', callerUrl)
    log('isEntrypoint =', isEntrypoint)

    return isEntrypoint
}

/** Run a synchronous CLI entrypoint with consistent error reporting and exit behavior. */
export function runCliIfEntrypoint<Args extends ReadonlyArray<unknown>>(
    callerMeta: ImportMetaWithUrl,
    mainFn: SyncFunction<Args, void>,
    ...args: Args
): void {
    runIfEntrypoint(
        callerMeta,
        (...innerArgs: Args) => {
            try {
                mainFn(...innerArgs)
            } catch (error) {
                console.error(
                    error instanceof Error
                        ? `Error: ${error.message}`
                        : String(error),
                )
                process.exit(1)
            }
        },
        ...args,
    )
}

/** Run an asynchronous CLI entrypoint with consistent error reporting and exit behavior. */
export async function runCliIfEntrypointAsync<
    Args extends ReadonlyArray<unknown>,
>(
    callerMeta: ImportMetaWithUrl,
    mainFn: AsyncFunction<Args, void>,
    ...args: Args
): Promise<void> {
    await runIfEntrypointAsync(
        callerMeta,
        async (...innerArgs: Args) => {
            try {
                await mainFn(...innerArgs)
            } catch (error) {
                console.error(
                    error instanceof Error
                        ? `Error: ${error.message}`
                        : String(error),
                )
                process.exit(1)
            }
        },
        ...args,
    )
}

/** Invoke a synchronous function only when its module is the process entrypoint. */
export function runIfEntrypoint<Args extends ReadonlyArray<unknown>, Result>(
    callerMeta: ImportMetaWithUrl,
    mainFn: SyncFunction<Args, Result>,
    ...args: Args
): Result | undefined {
    if (!isCallerEntrypoint(callerMeta)) return undefined

    return mainFn(...args)
}

/** Invoke an asynchronous function only when its module is the process entrypoint. */
export async function runIfEntrypointAsync<
    Args extends ReadonlyArray<unknown>,
    Result,
>(
    callerMeta: ImportMetaWithUrl,
    mainFn: AsyncFunction<Args, Result>,
    ...args: Args
): Promise<Result | undefined> {
    if (!isCallerEntrypoint(callerMeta)) return undefined

    return await mainFn(...args)
}

function toRealFileUrl(filePath: string): string {
    try {
        return pathToFileURL(realpathSync(filePath)).href
    } catch {
        return pathToFileURL(filePath).href
    }
}
