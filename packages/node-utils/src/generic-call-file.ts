import { pathToFileURL } from 'node:url'

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
    const entryUrl =
        entryPath === undefined ? undefined : pathToFileURL(entryPath).href

    const isEntrypoint = entryUrl !== undefined && callerMeta.url === entryUrl

    log('argv =', process.argv)
    log('argv[0] =', process.argv[0])
    log('argv[1] =', entryPath)
    log('entryUrl =', entryUrl)
    log('callerMeta.url =', callerMeta.url)
    log('isEntrypoint =', isEntrypoint)

    return isEntrypoint
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
