import { dayjs } from './dayjs.js'
import { format_duration_long, formatDurationFromMs, msToIsoString } from './duration.js'

/** Allowed diff units */
export type DayjsDiffUnit =
    | 'millisecond'
    | 'second'
    | 'minute'
    | 'hour'
    | 'day'
    | 'week'
    | 'month'
    | 'year'

/** Nanoseconds to milliseconds */
export const nsToMs = (ns_value: number): number => ns_value / 1_000_000

/** High-res timestamp (nanoseconds) to ISO string (UTC) */
export const highresTimestamptoISOString = (ns: number): string => msToIsoString(nsToMs(ns))

/** Get formatted duration between two high-res timestamps (nanoseconds) */
export const getTimestampDuration = (
    ns_in: number,
    ns_out: number,
    format: string = format_duration_long,
): string => {
    const diffMs = Math.abs(
        dayjs(highresTimestamptoISOString(ns_in)).diff(
            dayjs(highresTimestamptoISOString(ns_out)),
            'millisecond',
        ),
    )
    return formatDurationFromMs(diffMs, format)
}
