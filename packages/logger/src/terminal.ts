import ansis from 'ansis'
import {
    getColorAnsiInstance,
    GREY,
    isAnsiColorPreset,
    type LoggerColor,
} from './utilities/ansi.js'

export type BlockOptions = {
    after?: number
    before?: number
}

export type KabobOptions = {
    invert?: boolean
    marker?: string
    newline?: boolean
    padding?: number
    style?: TerminalStyle
    terminalWidth?: number
    textStyle?: TerminalStyle
    width?: WidthSpec
}

export type KeyValuePairOptions = {
    delimiter?: string
    keyStyle?: TerminalStyle
    keyWidth?: number
    valueStyle?: TerminalStyle
}

export type RuleOptions = {
    height?: number
    marker?: string
    newline?: boolean
    style?: TerminalStyle
    terminalWidth?: number
    width?: WidthSpec
}

export type StatusLevel =
    | 'critical'
    | 'err'
    | 'error'
    | 'fail'
    | 'failed'
    | 'fatal'
    | 'info'
    | 'ok'
    | 'pass'
    | 'passed'
    | 'success'
    | 'warn'
    | 'warning'

export type StatusPairOptions = KeyValuePairOptions & {
    level?: TerminalStyle
}

export type TerminalStyle = string

export type WidthSpec = 'auto' | `${number}%` | `${number}` | number

const ANSI_PATTERN = new RegExp(String.raw`\x1B\[[0-9;]*[A-Za-z]`, 'g')

export const stripAnsi = (value: string): string =>
    value.replace(ANSI_PATTERN, '')

export const visibleLength = (value: string): number => stripAnsi(value).length

export const getTerminalWidth = (): number => {
    const columns = process.stdout.columns
    if (Number.isInteger(columns) && columns > 0) return columns

    const envColumns = Number.parseInt(process.env.COLUMNS ?? '', 10)
    if (Number.isInteger(envColumns) && envColumns > 0) return envColumns

    return 80
}

export const resolveWidth = (
    width: WidthSpec = 'auto',
    terminalWidth: number = getTerminalWidth(),
): number => {
    const widthValue = String(width).trim()
    if (widthValue === '' || widthValue === 'auto') return terminalWidth

    if (widthValue.endsWith('%')) {
        const percentage = Number.parseInt(widthValue.slice(0, -1), 10)
        return Number.isFinite(percentage)
            ? Math.max(0, Math.floor((terminalWidth * percentage) / 100))
            : terminalWidth
    }

    const parsedWidth = Number.parseInt(widthValue, 10)
    return Number.isFinite(parsedWidth)
        ? Math.max(0, parsedWidth)
        : terminalWidth
}

export const buildRule = (marker = '-', width = 40): string => {
    const normalizedMarker = marker.length > 0 ? marker : '-'
    if (width <= 0) return ''
    if (normalizedMarker.length === 1) return normalizedMarker.repeat(width)

    let output = ''
    while (output.length < width) {
        output += normalizedMarker
    }
    return output.slice(0, width)
}

export const repeatRule = (marker = '-', width = 40, height = 1): string => {
    const normalizedHeight = Number.isInteger(height) && height > 0 ? height : 1
    const line = buildRule(marker, width)
    return Array.from({ length: normalizedHeight }, () => line).join('\n')
}

const toAnsiColorName = (style: string): LoggerColor | undefined => {
    const normalized = style.trim().toLowerCase().replaceAll('_', '-')
    if (isAnsiColorPreset(normalized)) return normalized

    try {
        getColorAnsiInstance(normalized)
        return normalized
    } catch {
        return undefined
    }
}

export const styleText = (
    value: string,
    style: TerminalStyle | undefined,
): string => {
    if (style === undefined || style === '' || style === 'reset') return value

    const normalized = style.trim().toLowerCase().replaceAll('_', '-')
    if (normalized === 'bold') return ansis.bold(value)
    if (normalized === 'dim') return ansis.dim(value)
    if (normalized === 'italic') return ansis.italic(value)
    if (normalized === 'underline') return ansis.underline(value)
    if (normalized === 'reverse' || normalized === 'inverse') {
        return ansis.inverse(value)
    }

    if (normalized.startsWith('bold-')) {
        return ansis.bold(styleText(value, normalized.slice('bold-'.length)))
    }
    if (normalized.startsWith('reverse-')) {
        return ansis.inverse(
            styleText(value, normalized.slice('reverse-'.length)),
        )
    }
    if (normalized.startsWith('fg-')) {
        return styleText(value, normalized.slice('fg-'.length))
    }
    if (normalized.startsWith('bg-')) {
        const color = toAnsiColorName(normalized.slice('bg-'.length))
        return color ? getColorAnsiInstance(color, 'bg')(value) : value
    }

    const color = toAnsiColorName(normalized)
    return color ? getColorAnsiInstance(color, 'fg')(value) : value
}

export const rule = (options: RuleOptions = {}): string => {
    const width = resolveWidth(
        options.width ?? 'auto',
        options.terminalWidth ?? getTerminalWidth(),
    )
    const output = repeatRule(options.marker ?? '=', width, options.height ?? 1)
    const styledOutput = styleText(output, options.style)
    return options.newline === false ? styledOutput : `${styledOutput}\n`
}

export const line = (
    marker = '-',
    options: Omit<RuleOptions, 'marker'> = {},
): string => rule({ ...options, marker, newline: options.newline ?? false })

export const spacer = (height = 1): string => {
    const normalizedHeight = Number.isInteger(height) && height > 0 ? height : 1
    return '\n'.repeat(normalizedHeight)
}

/** Wrap content with an exact amount of clean vertical space. */
export const block = (content: string, options: BlockOptions = {}): string => {
    const before = Math.max(0, options.before ?? 1)
    const after = Math.max(0, options.after ?? 1)
    const normalized = content.replace(/^\n+|\n+$/gu, '')
    return `${'\n'.repeat(before)}${normalized}${'\n'.repeat(after)}`
}

const resolveKabobSideWidths = (
    width: WidthSpec,
    availableWidth: number,
    middleWidth: number,
    terminalWidth: number,
): [number, number] => {
    const widthValue = String(width).trim()
    if (/^\d+$/.test(widthValue)) {
        const fixedWidth = Number.parseInt(widthValue, 10)
        return [fixedWidth, fixedWidth]
    }

    const requestedRuleWidth =
        widthValue === '' || widthValue === 'auto'
            ? availableWidth
            : resolveWidth(width, terminalWidth) - middleWidth
    const totalRuleWidth = Math.min(
        Math.max(0, requestedRuleWidth),
        availableWidth,
    )
    const leftWidth = Math.floor(Math.max(0, totalRuleWidth) / 2)
    return [leftWidth, Math.max(0, totalRuleWidth - leftWidth)]
}

export const kabob = (text: string, options: KabobOptions = {}): string => {
    const padding = Number.isInteger(options.padding)
        ? (options.padding ?? 2)
        : 2
    const terminalWidth = options.terminalWidth ?? getTerminalWidth()
    const textWidth = visibleLength(text)
    const middleWidth = textWidth + padding * 2
    const availableWidth = Math.max(0, terminalWidth - middleWidth)
    const [leftWidth, rightWidth] = resolveKabobSideWidths(
        options.width ?? 'auto',
        availableWidth,
        middleWidth,
        terminalWidth,
    )
    const marker = options.marker ?? '-'
    const leftRule = buildRule(marker, leftWidth)
    const rightRule = buildRule(marker, rightWidth)
    const paddingText = ' '.repeat(Math.max(0, padding))
    const textStyle = options.invert
        ? (value: string): string =>
              ansis.inverse(styleText(value, options.textStyle))
        : (value: string): string => styleText(value, options.textStyle)
    const output = `${leftRule}${paddingText}${textStyle(text)}${paddingText}${rightRule}`
    const styledOutput = styleText(output, options.style)
    return options.newline === false ? styledOutput : `${styledOutput}\n`
}

export const kebab: typeof kabob = kabob

export const header = (message: string, options: RuleOptions = {}): string => {
    const width = resolveWidth(
        options.width ?? 3,
        options.terminalWidth ?? getTerminalWidth(),
    )
    const marker = options.marker ?? '='
    const height = options.height ?? 1
    const headerRule = repeatRule(marker, width, height)
    return styleText(
        `\n${headerRule} ${message} ${headerRule}\n`,
        options.style,
    )
}

export const section = (title: string, options: KabobOptions = {}): string =>
    `\n${kabob(title, { padding: 1, ...options })}${spacer(1)}`

export const subheader = (
    message: string,
    style: TerminalStyle = 'bold',
): string => styleText(`\n${message}\n`, style)

export const step = (message: string, style: TerminalStyle = 'bold'): string =>
    styleText(`  -> ${message}`, style)

export const kvPair = (
    key: string,
    value: unknown,
    options: KeyValuePairOptions = {},
): string => {
    const keyWidth = options.keyWidth ?? 24
    const delimiter = options.delimiter ?? ' '
    const keyText = styleText(key.padEnd(keyWidth), options.keyStyle ?? 'bold')
    const valueText = styleText(String(value), options.valueStyle ?? 'gray')
    return `${keyText} ${delimiter}${valueText}`
}

export const statusStyleForValue = (value: string): TerminalStyle => {
    switch (value) {
        case 'clean':
            return 'green'
        case 'command failed (non-blocking)':
        case 'dirty':
            return 'yellow'
        case 'pnpm not installed':
            return 'red'
        default:
            return 'gray'
    }
}

export const statusStyleForLevel = (level: TerminalStyle): TerminalStyle => {
    switch (level) {
        case 'critical':
        case 'fatal':
            return 'bg-red'
        case 'err':
        case 'error':
        case 'fail':
        case 'failed':
            return 'red'
        case 'info':
            return 'gray'
        case 'ok':
        case 'pass':
        case 'passed':
        case 'success':
            return 'green'
        case 'warn':
        case 'warning':
            return 'yellow'
        default:
            return level
    }
}

export const statusPair = (
    key: string,
    value: string,
    options: StatusPairOptions = {},
): string =>
    kvPair(key, value, {
        ...options,
        keyStyle: options.keyStyle ?? 'bold-gray',
        valueStyle:
            options.valueStyle ??
            (options.level === undefined
                ? statusStyleForValue(value)
                : statusStyleForLevel(options.level)),
    })

export const GREY_RAMP: ReadonlyArray<string> = [
    GREY[50],
    GREY[100],
    GREY[200],
    GREY[300],
    GREY[400],
    GREY[500],
    GREY[600],
    GREY[700],
    GREY[800],
    GREY[900],
]

export const GRAY_RAMP: typeof GREY_RAMP = GREY_RAMP

export const greyRamp = (
    marker = ' ',
    segmentWidth = 5,
    colors: ReadonlyArray<string> = GREY_RAMP,
): string =>
    colors
        .map((color) =>
            styleText(buildRule(marker, segmentWidth), `bg-${color}`),
        )
        .join('')

export const grayRamp: typeof greyRamp = greyRamp
