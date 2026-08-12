import ora, { type Ora, type Options as OraOptions } from 'ora'

export type Spinner = {
    fail: (text?: string) => void
    info: (text?: string) => void
    persist: (text?: string, symbol?: string) => void
    setText: (text: string) => void
    start: () => void
    readonly status: SpinnerStatus
    stop: () => void
    succeed: (text?: string) => void
    warn: (text?: string) => void
}

export type SpinnerOptions = Pick<
    OraOptions,
    | 'color'
    | 'indent'
    | 'isEnabled'
    | 'isSilent'
    | 'prefixText'
    | 'spinner'
    | 'suffixText'
>

export type SpinnerStatus =
    | 'failed'
    | 'idle'
    | 'info'
    | 'persisted'
    | 'spinning'
    | 'succeeded'
    | 'warning'

export const createSpinner = (
    text = 'Loading...',
    options: SpinnerOptions = {},
): Spinner => {
    let spinner: null | Ora = null
    let status: SpinnerStatus = 'idle'

    const finish = (
        nextStatus: SpinnerStatus,
        method: 'fail' | 'info' | 'succeed' | 'warn',
        finalText?: string,
    ): void => {
        spinner ??= ora({ ...options, text })
        spinner[method](finalText)
        spinner = null
        status = nextStatus
    }

    return {
        fail: (finalText): void => {
            finish('failed', 'fail', finalText)
        },
        info: (finalText): void => {
            finish('info', 'info', finalText)
        },
        persist: (finalText, symbol = '🐌'): void => {
            spinner ??= ora({ ...options, text })
            spinner.stopAndPersist({ symbol, text: finalText })
            spinner = null
            status = 'persisted'
        },
        setText: (newText: string): void => {
            if (spinner) spinner.text = newText
        },
        start: (): void => {
            spinner ??= ora({ ...options, text }).start()
            status = 'spinning'
        },
        get status(): SpinnerStatus {
            return status
        },
        stop: (): void => {
            if (!spinner) return
            spinner.stop()
            spinner = null
            status = 'idle'
        },
        succeed: (finalText): void => {
            finish('succeeded', 'succeed', finalText)
        },
        warn: (finalText): void => {
            finish('warning', 'warn', finalText)
        },
    }
}

/** Compatibility name retained for cli-app consumers. */
export type ProgressBar = Spinner

/** Compatibility name retained for cli-app consumers. */
export const createProgressBar: typeof createSpinner = createSpinner
