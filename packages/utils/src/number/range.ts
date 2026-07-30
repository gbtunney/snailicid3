/** A numeric range represented as `[minimum, maximum]`. */
export type Range = [number, number]

export const RANGE_DEGREES: Range = [0, 360]
export const RANGE_FLOAT: Range = [0, 1]
export const RANGE_PERCENT: Range = [0, 100]
export const RANGE_RGB: Range = [0, 255]

/** Map a value proportionally from one range into another. */
export const mapRange = (
    value: number,
    [fromMinimum, fromMaximum]: Range,
    [toMinimum, toMaximum]: Range,
): number => {
    const ratio = (value - fromMinimum) / (fromMaximum - fromMinimum)
    return toMinimum + ratio * (toMaximum - toMinimum)
}

/** Clamp a value to the inclusive range. */
export const clampRange = (value: number, [minimum, maximum]: Range): number =>
    Math.min(maximum, Math.max(minimum, value))

/** Wrap a value into the half-open range `[minimum, maximum)`. */
export const wrapRange = (value: number, [minimum, maximum]: Range): number => {
    const span = maximum - minimum
    if (span <= 0) {
        throw new RangeError(
            `Invalid range: maximum (${String(maximum)}) must exceed minimum (${String(minimum)})`,
        )
    }
    return ((((value - minimum) % span) + span) % span) + minimum
}

/** Round a finite value to a number of decimal places. */
export const roundToDecimals = (
    value: number,
    decimals: number,
    round: (value: number) => number = Math.round,
): number => {
    if (!Number.isFinite(value)) return value
    if (decimals <= 0) return round(value)
    const factor = 10 ** decimals
    return round(value * factor) / factor
}

/** Truncate a finite value to a number of decimal places without carrying. */
export const roundToDecimalsNoCarry = (
    value: number,
    decimals: number,
): number => roundToDecimals(value, decimals, Math.trunc)
