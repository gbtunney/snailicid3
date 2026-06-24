import chalk, { modifierNames } from 'chalk'
import dayjs from 'dayjs'
import { fmt, formatArgs } from './pretty.print.js'
import {
    type ChalkColor,
    getColorChalkInstance,
    wrapColorChalkInstanceText,
} from './utilities/chalk.js'
import { parseColorToHexStrict } from './utilities/color.js'

export type LogLevelColors = ChalkColor

export const LEVEL_NAMES = [
    'trace',
    'info',
    'debug',
    'warn',
    'error',
    'fatal',
    'silent',
] as const
export type LoggerRecord<Value> = ExhaustiveRecordFrom<
    typeof LEVEL_NAMES,
    Value
>

export type LogLevelName = (typeof LEVEL_NAMES)[number]

/** Builds a Record<K, V> where K is inferred from array or object T. Enforces exhaustiveness: no extra or missing keys. */
type ExhaustiveRecordFrom<
    Type extends ReadonlyArray<unknown> | Record<keyof unknown, unknown>,
    Value = unknown,
> = Record<ExtractKeys<Type>, Value>

type ExtractKeys<
    Type extends ReadonlyArray<unknown> | Record<keyof unknown, unknown>,
> =
    Type extends ReadonlyArray<infer U>
        ? Extract<U, PropertyKey>
        : Type extends Record<PropertyKey, unknown>
          ? keyof Type
          : never

export const LOG_LEVELS: LoggerRecord<number> = {
    debug: 35,
    error: 50,
    fatal: 60,
    info: 30,
    silent: 99,
    trace: 10,
    warn: 40,
}

export const LEVEL_COLORS: LoggerRecord<ChalkColor> = {
    debug: 'blue',
    error: 'red',
    fatal: 'magenta',
    info: parseColorToHexStrict('#0bb806'),
    silent: 'white',
    trace: 'gray',
    warn: 'yellow',
}
const LEVEL_STYLES = modifierNames

const isBrowser = (): boolean => 'document' in globalThis

const RESET = '\x1b[0m'

export type Logger = {
    child: (name: string, overrides?: Partial<LoggerOpts>) => Logger
    debug: <Type extends Array<unknown>>(...a: Type) => void
    error: <Type extends Array<unknown>>(...a: Type) => void
    fatal: <Type extends Array<unknown>>(...a: Type) => void
    info: <Type extends Array<unknown>>(...a: Type) => void
    readonly level: LogLevelName
    readonly name: string | undefined
    setLevel: (level: LogLevelName) => void
    trace: <Type extends Array<unknown>>(...a: Type) => void
    warn: <Type extends Array<unknown>>(...a: Type) => void
}

export type LoggerOpts = {
    colors?: Partial<LoggerRecord<LogLevelColors>>
    level?: LogLevelName
    name?: string
    time_format?: string
    time_stamp?: boolean
}

type LoggerConfig = {
    colors: LoggerRecord<LogLevelColors>
    level: LogLevelName
    name?: string | undefined
    time_format: string
    time_stamp: boolean
}

/** TODO: use hex color in config */
function colorizeBrowser(
    label: string,
    color: LogLevelColors,
): [string, string, string] {
    const css = fmt`color:${color};font-weight:600`
    return [`%c${label}%c`, css, '']
}

function pickConsole(level: LogLevelName): (...args: Array<unknown>) => void {
    switch (level) {
        case 'debug':
            return console.debug.bind(console)
        case 'error':
        case 'fatal':
            return console.error.bind(console)
        case 'info':
            return console.info.bind(console)
        case 'warn':
            return console.warn.bind(console)
        default:
            return console.log.bind(console)
    }
}

const isLogLevelName = (value: string): value is LogLevelName =>
    LEVEL_NAMES.includes(value as LogLevelName)

const normalizeLoggerOpts = (opts: LoggerOpts = {}): LoggerConfig => {
    const level: string = opts.level ?? 'info'
    if (!isLogLevelName(level)) {
        throw new Error(`Invalid logger level: ${level}`)
    }

    const name = opts.name?.trim()

    return {
        colors: {
            ...LEVEL_COLORS,
            ...(opts.colors ?? {}),
        },
        level: level,
        name: name ? name : undefined,
        time_format: opts.time_format ?? 'hh:mm:ss',
        time_stamp: opts.time_stamp ?? false,
    }
}

export const createLogger = (opts?: LoggerOpts): Logger => {
    const cfg = normalizeLoggerOpts(opts)

    // Internal state (captured by closure)
    /** (cfg.name ?? '').trim() */
    const name: string | undefined = cfg.name
    const loggerName = cfg.name === undefined ? undefined : cfg.name

    let minLevel: number = LOG_LEVELS[cfg.level]
    const showTime: boolean = cfg.time_stamp
    const timeFormat = cfg.time_format
    const colors: LoggerRecord<LogLevelColors> = cfg.colors

    const shouldLog = (level: LogLevelName): boolean =>
        LOG_LEVELS[level] >= minLevel && level !== 'silent'

    const prefix = (level: LogLevelName): string => {
        const bg_color = getColorChalkInstance(colors[level], 'bg')
        //AssertChalkColor( color)
        return [
            bg_color.bold(` ===> ${chalk.bold(level.toUpperCase())} `),
            chalk.italic(showTime ? dayjs().format(timeFormat) : ''),
            name ? [`[${name}]`] : [],
        ].join(' ')
    }

    const emit = <Type extends Array<unknown>>(
        level: LogLevelName,
        ...args: Type
    ): void => {
        if (!shouldLog(level)) return
        const out = pickConsole(level)
        const head = prefix(level)
        const color = colors[level]
        if (isBrowser()) {
            const [fmt, css, reset] = colorizeBrowser(head, 'red')
            out(fmt, css, reset, ...args)
        } else {
            //Chalk.bgRed('THIS IS A COLOR ', color)
            out(
                wrapColorChalkInstanceText(head, color, 'fg'),
                formatArgs('', ...args),
            )
        }
    }

    const _levelName = (): LogLevelName => {
        const levelEntry = Object.entries(LOG_LEVELS).find(
            ([, levelNumber]) => levelNumber === minLevel,
        )
        return levelEntry ? (levelEntry[0] as LogLevelName) : 'info'
    }

    return {
        child: (childName, overrides = {}): Logger =>
            createLogger({
                ...cfg,
                ...overrides,
                name: name ? `${name}:${childName}` : childName,
            }),
        debug: (...args): void => {
            emit('debug', ...args)
        },

        error: (...args): void => {
            emit('error', ...args)
        },

        fatal: (...args): void => {
            emit('fatal', ...args)
        },
        info: (...args): void => {
            emit('info', ...args)
        },
        get level(): LogLevelName {
            return _levelName()
        },
        get name(): string | undefined {
            return loggerName
        },
        setLevel: (level: LogLevelName): void => {
            minLevel = LOG_LEVELS[level]
        },
        trace: (...args): void => {
            emit('trace', ...args)
        },
        warn: (...args): void => {
            emit('warn', ...args)
        },
    }
}

// Optional singleton
let loggerInstance: Logger | undefined

/**
 * GetLogger():
 *
 * - Without opts: returns the shared singleton (created on first call).
 * - With opts: returns a new, non-singleton instance configured with those opts.
 */
/** ...existing code... */
export const getLogger = (opts?: LoggerOpts, makeDefault = false): Logger => {
    if (!loggerInstance) {
        loggerInstance = createLogger(opts)
        return loggerInstance
    } else {
        if (opts === undefined) {
            return (loggerInstance ??= createLogger())
        }
        const inst = createLogger(opts)
        if (makeDefault) loggerInstance = inst
        return inst
    }
}
/** Replace the singleton instance */
export const setLogger = (logger: Logger): Logger => (loggerInstance = logger)

/** Clear the singleton so next getLogger() creates a new one */
export const resetLogger = (): void => {
    loggerInstance = undefined
}
