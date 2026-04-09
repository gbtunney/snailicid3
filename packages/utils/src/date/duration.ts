import { dayjs } from './dayjs.js'

/**
 * Duration format presets
 *
 * @category Duration
 */
export const format_duration_long = 'HH:mm:ss.SS'
export const format_duration_truncated = 'mm:ss'
export const format_duration_basic = 'mm:ss.SS'

/** Milliseconds to ISO String (UTC) */
export const msToIsoString = (ms_value: number): string =>
    dayjs.utc(ms_value).toISOString()

/**
 * Format a millisecond count into a custom duration pattern (HH:mm:ss.SS, mm:ss, mm:ss.SS).
 * Dayjs duration plugin does not support pattern tokens directly, so this builds manually.
 */
export const formatDurationFromMs = (
    ms: number,
    pattern: string = format_duration_long,
): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const milliseconds = ms % 1000
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const hundredths = Math.floor(milliseconds / 10)

    const pad = (value: number, length: number = 2): string =>
        String(value).padStart(length, '0')

    switch (pattern) {
        case format_duration_long:
            return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`
        case format_duration_basic:
            return `${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`
        case format_duration_truncated:
            return `${pad(minutes)}:${pad(seconds)}`
        default:
            return dayjs.utc(ms).format(pattern)
    }
}

/** Format an ISO string into a duration-style pattern */
export const formatISOtoDuration = (
    iso_string: string,
    format: string = format_duration_long,
): string => formatDurationFromMs(dayjs(iso_string).valueOf(), format)
