/**
 * Future Structure for this (or cli-app maybe ?)
 *
 * ```txt
 * entrypoint.ts          generic “am I being run directly?”
 * cli.ts                 generic CLI runner + error handling
 * argv.ts                generic argv → object parsing
 * zod-argv.ts            Zod schema parsing/coercion
 * scope/commit.ts        actual scope-commit command
 * scope/affected.ts      actual scope-affected command
 * ```
 */

import { realpathSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

const toRealPath = (filePath: string): string => {
    try {
        return realpathSync(path.resolve(filePath))
    } catch {
        return path.resolve(filePath)
    }
}

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

    const entryPath = process.argv[1]

    const entryRealPath = toRealPath(entryPath)
    const callerRealPath = toRealPath(fileURLToPath(callerMeta.url))
    const isEntrypoint = entryRealPath === callerRealPath

    log('argv =', process.argv)
    log('argv[0] =', process.argv[0])
    log('argv[1] =', entryPath)
    log('entryRealPath =', entryRealPath)
    log('callerMeta.url =', callerMeta.url)
    log('callerRealPath =', callerRealPath)
    log('isEntrypoint =', isEntrypoint)

    return isEntrypoint
}

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

export function runIfEntrypoint<Args extends ReadonlyArray<unknown>, Result>(
    callerMeta: ImportMetaWithUrl,
    mainFn: SyncFunction<Args, Result>,
    ...args: Args
): Result | undefined {
    if (!isCallerEntrypoint(callerMeta)) return undefined

    return mainFn(...args)
}

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
