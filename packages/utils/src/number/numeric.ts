export type Numeric = bigint | number

export type PossibleNumeric = number | bigint | string

export type NumericStringKind =
    | 'decimal'
    | 'scientific'
    | 'exponential'
    | 'hex'
    | 'octal'
    | 'binary'
    | 'bigint'
    | undefined

export type NumericString<K extends NumericStringKind> = string & {
    readonly _numericKind: K
}
