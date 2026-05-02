export type Numeric = bigint | number

export type NumericString<Kind extends NumericStringKind> = string & {
    readonly _numericKind: Kind
}

export type NumericStringKind =
    | 'bigint'
    | 'binary'
    | 'decimal'
    | 'exponential'
    | 'hex'
    | 'octal'
    | 'scientific'
    | undefined

export type PossibleNumeric = bigint | number | string
