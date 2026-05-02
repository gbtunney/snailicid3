/** @internal */
export type BaseValue = {
    value: string
}
/** @internal */
export type BatchBaseValue = {
    value: Array<string> | string
}
/** @internal */
export type Pattern = RegExp | string

/** @internal */
export type ReplaceCharacters = {
    /** Default is is empty string */
    replacement: string
}
/** @internal */
export type TrimCharacters = {
    /** Default is true. */
    doTrimEnd?: boolean
    /** Default is true. */
    doTrimStart?: boolean
}
