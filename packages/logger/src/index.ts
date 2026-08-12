import {
    createLogger,
    getLogger,
    LEVEL_COLORS,
    LEVEL_NAMES,
    LOG_LEVELS,
    resetLogger,
    setLogger,
} from './logger.js'
import { createProgressBar, createSpinner } from './spinner.js'
import { table } from './table.js'
import {
    block,
    buildRule,
    GRAY_RAMP,
    grayRamp,
    GREY_RAMP,
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
import { getColorAnsiInstance, wrapColorAnsiText } from './utilities/ansi.js'

export type LoggerApi = {
    block: typeof block
    buildRule: typeof buildRule
    create: typeof createLogger
    createProgressBar: typeof createProgressBar
    createSpinner: typeof createSpinner
    get: typeof getLogger
    getAnsiInstance: typeof getColorAnsiInstance
    GRAY_RAMP: typeof GRAY_RAMP
    grayRamp: typeof grayRamp
    GREY_RAMP: typeof GREY_RAMP
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
    table: typeof table
    visibleLength: typeof visibleLength
    wrapAnsiText: typeof wrapColorAnsiText
}

/** @internal */
export const logger: LoggerApi = {
    block: block,
    buildRule: buildRule,
    create: createLogger,
    createProgressBar: createProgressBar,
    createSpinner: createSpinner,
    get: getLogger,
    getAnsiInstance: getColorAnsiInstance,
    GRAY_RAMP: GRAY_RAMP,
    grayRamp: grayRamp,
    GREY_RAMP: GREY_RAMP,
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
    table: table,
    visibleLength: visibleLength,
    wrapAnsiText: wrapColorAnsiText,
}

/** @internal */
export default logger

export {
    buildLoggerDemo,
    type LoggerDemoOptions,
    runLevelLoggerDemo,
    runLoggerDemo,
} from './demo.js'
export type {
    Logger,
    LoggerOpts,
    LogLevelColors,
    LogLevelName,
} from './logger.js'

export { getLogger, LOG_LEVELS } from './logger.js'
export { formatArgs, formatValue, prettify } from './pretty.print.js'
export { fmt } from './pretty.print.js'
export {
    createProgressBar,
    createSpinner,
    type ProgressBar,
    type Spinner,
    type SpinnerOptions,
    type SpinnerStatus,
} from './spinner.js'
export { table, type TableOptions, type TableRow } from './table.js'

export {
    block,
    buildRule,
    GRAY_RAMP,
    grayRamp,
    GREY_RAMP,
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
    BlockOptions,
    KabobOptions,
    KeyValuePairOptions,
    RuleOptions,
    StatusLevel,
    StatusPairOptions,
    TerminalStyle,
    WidthSpec,
} from './terminal.js'
export {
    type AnsiColorPreset,
    ansiPresetToColorJS,
    ansiPresetToHex,
    getColorAnsiInstance,
    GRAY,
    GREY,
    type GreyAlias,
    type GreyPalette,
    type GreyShade,
    isAnsiColorPreset,
    type LoggerColor,
    terminalLink,
    wrapColorAnsiText,
} from './utilities/ansi.js'
export { parseColorToHexStrict as parseHexColor } from './utilities/color.js'
