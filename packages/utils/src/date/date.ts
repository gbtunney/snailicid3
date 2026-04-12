import type { LiteralUnion } from 'type-fest'

import { dayjs } from './dayjs.js'

/** @category Format */
export const format_date_time_short = 'MM-DD-YYYY, h:mm:ss a'
/** @category Format */
export const format_date_time_long = 'MMMM D YYYY, h:mm:ss a'

/** Dayjs uses ISO 8601 */
export type ISO_8601 = 'ISO_8601'

/** ISO 8601 validation */
export const isValidIsoDate = (value: string): boolean => dayjs(value).isValid()

/** Strict date validation against a format (customParseFormat strict mode) */
export const isValidDate = (value: string, format: string = format_date_time_short): boolean => {
    const parsed = dayjs(value, format, true)
    return parsed.isValid()
}

/** Format ISO date or custom. If format === 'ISO_8601' returns canonical ISO string. */
export const formatIsoDate = (
    value: string = dayjs().toISOString(),
    format: LiteralUnion<ISO_8601, string> = format_date_time_short,
): string =>
    isValidIsoDate(value) && format === 'ISO_8601'
        ? dayjs(value).toISOString()
        : dayjs(value).format(format)
