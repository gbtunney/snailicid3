/** A numeric range [min, max]. */
export type Range = [number, number]

export const RANGE_PERCENT: Range = [0, 100]
export const RANGE_FLOAT: Range = [0, 1]
export const RANGE_RGB: Range = [0, 255]
export const RANGE_DEGREES: Range = [0, 360]

/** Map a value from one range to another. */
export const mapRange = (
    value: number,
    [fromMin, fromMax]: Range,
    [toMin, toMax]: Range,
): number => {
    const t = (value - fromMin) / (fromMax - fromMin)
    return toMin + t * (toMax - toMin)
}

/** Wrap a value within [min, max). */
export const wrapRange = (value: number, [min, max]: Range): number => {
    const span = max - min
    return ((((value - min) % span) + span) % span) + min
}

/** Clamp a value to [min, max]. */
export const clampRange = (value: number, [min, max]: Range): number =>
    Math.min(max, Math.max(min, value))

/** Round to N decimal places. */
export const roundToDecimals = (
    value: number,
    decimals: number,
    func: (n: number) => number = Math.round,
): number => {
    const factor = Math.pow(10, decimals)
    return func(value * factor) / factor
}
