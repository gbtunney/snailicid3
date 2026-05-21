import {
    createLogger,
    getLogger,
    LEVEL_COLORS,
    LEVEL_NAMES,
    LOG_LEVELS,
    resetLogger,
    setLogger,
} from './logger.js'
import {
    buildRule,
    grayRamp,
    greyRamp,
    header,
    kabob,
    kebab,
    kvPair,
    line,
    repeatRule,
    resolveWidth,
    rule,
    section,
    spacer,
    statusPair,
    step,
    stripAnsi,
    styleText,
    subheader,
    visibleLength,
} from './terminal.js'
import {
    getColorChalkInstance,
    wrapColorChalkInstanceText,
} from './utilities/chalk.js'

export type LoggerApi = {
    buildRule: typeof buildRule
    create: typeof createLogger
    get: typeof getLogger
    getChalkInstance: typeof getColorChalkInstance
    grayRamp: typeof grayRamp
    greyRamp: typeof greyRamp
    header: typeof header
    kabob: typeof kabob
    kebab: typeof kebab
    kvPair: typeof kvPair
    LEVEL_COLORS: typeof LEVEL_COLORS
    LEVEL_NAMES: typeof LEVEL_NAMES
    line: typeof line
    LOG_LEVELS: typeof LOG_LEVELS
    repeatRule: typeof repeatRule
    reset: typeof resetLogger
    resolveWidth: typeof resolveWidth
    rule: typeof rule
    section: typeof section
    set: typeof setLogger
    spacer: typeof spacer
    statusPair: typeof statusPair
    step: typeof step
    stripAnsi: typeof stripAnsi
    styleText: typeof styleText
    subheader: typeof subheader
    visibleLength: typeof visibleLength
    wrapChalkText: typeof wrapColorChalkInstanceText
}

/** @internal */
export const logger: LoggerApi = {
    buildRule: buildRule,
    create: createLogger,
    get: getLogger,
    getChalkInstance: getColorChalkInstance,
    grayRamp: grayRamp,
    greyRamp: greyRamp,
    header: header,
    kabob: kabob,
    kebab: kebab,
    kvPair: kvPair,
    LEVEL_COLORS: LEVEL_COLORS,
    LEVEL_NAMES: LEVEL_NAMES,
    line: line,
    LOG_LEVELS: LOG_LEVELS,
    repeatRule: repeatRule,
    reset: resetLogger,
    resolveWidth: resolveWidth,
    rule: rule,
    section: section,
    set: setLogger,
    spacer: spacer,
    statusPair: statusPair,
    step: step,
    stripAnsi: stripAnsi,
    styleText: styleText,
    subheader: subheader,
    visibleLength: visibleLength,
    wrapChalkText: wrapColorChalkInstanceText,
}

/** @internal */
export default logger

export {
    buildLoggerDemo,
    type LoggerDemoOptions,
    runLoggerDemo,
} from './demo.js'
export type {
    Logger,
    LoggerOpts,
    LogLevelColors,
    LogLevelName,
} from './logger.js'

export { getLogger, LOG_LEVELS } from './logger.js'
export {
    fmt,
    formatArgs,
    formatValue,
    prettify,
    prettyPrint,
} from './pretty.print.js'

export {
    buildRule,
    grayRamp,
    greyRamp,
    header,
    kabob,
    kebab,
    kvPair,
    line,
    repeatRule,
    resolveWidth,
    rule,
    section,
    spacer,
    statusPair,
    statusStyleForLevel,
    statusStyleForValue,
    step,
    stripAnsi,
    styleText,
    subheader,
    visibleLength,
} from './terminal.js'
export type {
    KabobOptions,
    KeyValuePairOptions,
    RuleOptions,
    StatusLevel,
    StatusPairOptions,
    TerminalStyle,
    WidthSpec,
} from './terminal.js'
export { type ChalkColor } from './utilities/chalk.js'
export { parseColorToHexStrict as parseHexColor } from './utilities/color.js'
